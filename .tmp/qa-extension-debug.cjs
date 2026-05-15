const fs = require('node:fs/promises')
const path = require('node:path')

const apiBaseUrl = 'http://localhost:3333'
const extensionDistPath = path.resolve('apps/extension/dist')
const outputDir = path.resolve('.tmp/qa-artifacts')

const credentials = {
  email: 'admin@salonzap.local',
  password: '123456',
}

async function ensureDir(target) {
  await fs.mkdir(target, { recursive: true })
}

async function loadPlaywright() {
  const npxCacheDir = path.join(process.env.LOCALAPPDATA, 'npm-cache', '_npx')
  const buckets = await fs.readdir(npxCacheDir, { withFileTypes: true })
  const candidates = []

  for (const bucket of buckets) {
    if (!bucket.isDirectory()) continue

    const packageJsonPath = path.join(
      npxCacheDir,
      bucket.name,
      'node_modules',
      'playwright',
      'package.json',
    )

    try {
      const stat = await fs.stat(packageJsonPath)
      candidates.push({ packageJsonPath, modified: stat.mtimeMs })
    } catch {}
  }

  candidates.sort((left, right) => right.modified - left.modified)
  const playwrightDir = path.dirname(candidates[0].packageJsonPath)
  return require(playwrightDir)
}

async function waitForPageStable(page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
}

async function main() {
  await ensureDir(outputDir)
  const { chromium } = await loadPlaywright()
  const userDataDir = path.resolve('.tmp/playwright-extension-profile')
  await ensureDir(userDataDir)

  console.log('launching persistent context')
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1440, height: 900 },
    args: [
      `--disable-extensions-except=${extensionDistPath}`,
      `--load-extension=${extensionDistPath}`,
    ],
  })

  try {
    console.log('waiting for service worker')
    const serviceWorker = await context.waitForEvent('serviceworker', { timeout: 60000 })
    const extensionId = serviceWorker.url().split('/')[2]
    const popupUrl = `chrome-extension://${extensionId}/index.html`
    console.log('extension id', extensionId)

    const popup = await context.newPage()
    console.log('opening popup')
    await popup.goto(popupUrl)
    await waitForPageStable(popup)
    await popup.screenshot({
      path: path.join(outputDir, 'extension-popup-debug.png'),
      fullPage: true,
    })
    console.log('popup ok')

    const whatsapp = await context.newPage()
    console.log('opening whatsapp')
    await whatsapp.goto('https://web.whatsapp.com/')
    await whatsapp.waitForTimeout(8000)
    await whatsapp.screenshot({
      path: path.join(outputDir, 'extension-whatsapp-debug.png'),
      fullPage: true,
    })

    const root = whatsapp.locator('#salonzap-extension-root')
    await root.waitFor({ state: 'visible', timeout: 30000 })
    console.log('root visible')

    await root.getByLabel('API URL').fill('http://localhost:9999')
    await root.getByLabel('E-mail').fill(credentials.email)
    await root.getByLabel('Senha').fill(credentials.password)
    await root.getByRole('button', { name: 'Conectar extensao' }).click()
    await whatsapp.waitForTimeout(1800)
    await whatsapp.screenshot({
      path: path.join(outputDir, 'extension-whatsapp-error-debug.png'),
      fullPage: true,
    })
    console.log('error state ok')

    await root.getByLabel('API URL').fill(apiBaseUrl)
    await root.getByRole('button', { name: 'Conectar extensao' }).click()
    await whatsapp.waitForTimeout(2600)
    await whatsapp.screenshot({
      path: path.join(outputDir, 'extension-whatsapp-auth-debug.png'),
      fullPage: true,
    })
    console.log('authenticated state ok')
  } finally {
    await context.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
