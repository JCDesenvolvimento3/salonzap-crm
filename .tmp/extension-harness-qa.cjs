const fs = require('node:fs/promises')
const http = require('node:http')
const path = require('node:path')

const distDir = path.resolve('apps/extension/dist')
const outputDir = path.resolve('.tmp/qa-artifacts')
const port = 4174
const apiBaseUrl = 'http://localhost:3333'
const badApiUrl = 'http://localhost:9999'

const credentials = {
  email: 'admin@salonzap.local',
  password: '123456',
}

function getContentType(filePath) {
  if (filePath.endsWith('.html')) return 'text/html; charset=utf-8'
  if (filePath.endsWith('.js')) return 'text/javascript; charset=utf-8'
  if (filePath.endsWith('.css')) return 'text/css; charset=utf-8'
  if (filePath.endsWith('.json')) return 'application/json; charset=utf-8'
  if (filePath.endsWith('.svg')) return 'image/svg+xml'
  return 'application/octet-stream'
}

async function ensureDir(target) {
  await fs.mkdir(target, { recursive: true })
}

async function loadPlaywright() {
  const npxCacheDir = path.join(process.env.LOCALAPPDATA, 'npm-cache', '_npx')
  const buckets = await fs.readdir(npxCacheDir, { withFileTypes: true })
  const candidates = []

  for (const bucket of buckets) {
    if (!bucket.isDirectory()) {
      continue
    }

    const packageJsonPath = path.join(
      npxCacheDir,
      bucket.name,
      'node_modules',
      'playwright',
      'package.json',
    )

    try {
      const stat = await fs.stat(packageJsonPath)
      candidates.push({
        packageJsonPath,
        modified: stat.mtimeMs,
      })
    } catch {}
  }

  candidates.sort((left, right) => right.modified - left.modified)

  if (!candidates.length) {
    throw new Error('Playwright package was not found in the npx cache.')
  }

  return require(path.dirname(candidates[0].packageJsonPath))
}

async function collectMetrics(page) {
  return page.evaluate(() => ({
    title: document.title,
    bodyTextLength: document.body.innerText.trim().length,
    horizontalPageOverflow: document.documentElement.scrollWidth - window.innerWidth,
  }))
}

function getHarnessBootstrapScript() {
  return `
    <script>
      (function () {
        const prefix = 'salonzap-harness:'
        const read = (key) => {
          const value = window.localStorage.getItem(prefix + key)
          return value === null ? undefined : value
        }
        const write = (key, value) => {
          if (value === null || value === undefined) {
            window.localStorage.removeItem(prefix + key)
            return
          }
          window.localStorage.setItem(prefix + key, value)
        }
        const storageApi = {
          async get(keys) {
            const list = Array.isArray(keys) ? keys : Object.keys(keys || {})
            const result = {}
            for (const key of list) {
              result[key] = read(key)
            }
            return result
          },
          async set(values) {
            for (const [key, value] of Object.entries(values)) {
              write(key, value)
            }
          }
        }
        window.chrome = window.chrome || {}
        window.chrome.storage = window.chrome.storage || {}
        window.chrome.storage.local = storageApi
        globalThis.chrome = window.chrome

        if (!navigator.clipboard) {
          Object.defineProperty(navigator, 'clipboard', {
            value: {
              async writeText(value) {
                window.localStorage.setItem(prefix + 'clipboard', value)
              }
            },
            configurable: true
          })
        }
      })()
    </script>
  `
}

async function buildPopupHtml() {
  const popupHtml = await fs.readFile(path.join(distDir, 'index.html'), 'utf8')
  return popupHtml
    .replace('<head>', `<head>${getHarnessBootstrapScript()}`)
    .replaceAll('href="/', 'href="/dist/')
    .replaceAll('src="/', 'src="/dist/')
}

function buildSidebarHtml(contentAsset) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>SalonZap Extension Harness</title>
    <style>
      :root {
        color-scheme: dark;
        font-family: "Segoe UI", sans-serif;
      }
      body {
        margin: 0;
        min-height: 100vh;
        background: #0b141a;
        color: #e9edef;
      }
      .wa-shell {
        display: grid;
        grid-template-columns: 364px minmax(0, 1fr);
        min-height: 100vh;
      }
      .wa-left {
        border-right: 1px solid rgba(255,255,255,0.08);
        background: #111b21;
      }
      .wa-chat {
        display: flex;
        flex-direction: column;
        min-width: 0;
        background:
          radial-gradient(circle at top right, rgba(127,232,255,0.06), transparent 18%),
          #0b141a;
      }
      #main header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 18px 24px;
        border-bottom: 1px solid rgba(255,255,255,0.08);
        background: rgba(17, 27, 33, 0.92);
      }
      #main header img {
        width: 42px;
        height: 42px;
        border-radius: 999px;
        object-fit: cover;
      }
      .wa-header-copy {
        min-width: 0;
      }
      .wa-header-copy span,
      .wa-header-copy div {
        display: block;
        overflow-wrap: anywhere;
      }
      .wa-thread {
        flex: 1;
        padding: 32px 24px;
        color: rgba(233,237,239,0.82);
      }
      #main footer {
        padding: 18px 24px;
        border-top: 1px solid rgba(255,255,255,0.08);
        background: rgba(17, 27, 33, 0.92);
      }
      #main footer [contenteditable="true"] {
        min-height: 52px;
        border-radius: 16px;
        background: rgba(255,255,255,0.06);
        padding: 14px 16px;
        outline: none;
      }
      @media (max-width: 1200px) {
        .wa-shell {
          grid-template-columns: minmax(0, 1fr);
        }
        .wa-left {
          display: none;
        }
      }
    </style>
    ${getHarnessBootstrapScript()}
  </head>
  <body>
    <div class="wa-shell">
      <aside class="wa-left"></aside>
      <section class="wa-chat" id="main">
        <header>
          <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80" alt="Fernanda Lima" />
          <div class="wa-header-copy">
            <span title="Fernanda Lima">Fernanda Lima</span>
            <div dir="auto">Cliente VIP aguardando retorno sobre pacote premium</div>
            <span dir="auto">+55 31 95555-0022</span>
          </div>
        </header>
        <div class="wa-thread">
          <p>Harness local para revisar a sidebar do build final dentro de uma estrutura semelhante ao WhatsApp Web.</p>
        </div>
        <footer>
          <div contenteditable="true" role="textbox" aria-label="Message"></div>
        </footer>
      </section>
    </div>
    <script type="module" src="/dist/assets/${contentAsset}"></script>
  </body>
</html>`
}

async function createServer() {
  const assets = await fs.readdir(path.join(distDir, 'assets'))
  const contentAsset = assets.find((entry) => /^content\.tsx-.*\.js$/.test(entry))

  if (!contentAsset) {
    throw new Error('Could not locate the built content script asset.')
  }

  const popupHtml = await buildPopupHtml()
  const sidebarHtml = buildSidebarHtml(contentAsset)

  const server = http.createServer(async (request, response) => {
    try {
      const requestUrl = new URL(request.url, `http://127.0.0.1:${port}`)

      if (requestUrl.pathname === '/' || requestUrl.pathname === '/popup.html') {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        response.end(popupHtml)
        return
      }

      if (requestUrl.pathname === '/sidebar.html') {
        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
        response.end(sidebarHtml)
        return
      }

      if (requestUrl.pathname.startsWith('/dist/')) {
        const localPath = path.join(distDir, requestUrl.pathname.replace('/dist/', '').replaceAll('/', path.sep))
        const file = await fs.readFile(localPath)
        response.writeHead(200, { 'Content-Type': getContentType(localPath) })
        response.end(file)
        return
      }

      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end('Not found')
    } catch (error) {
      response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' })
      response.end(error instanceof Error ? error.message : 'Internal server error')
    }
  })

  await new Promise((resolve) => server.listen(port, '127.0.0.1', resolve))
  return server
}

async function waitForPageStable(page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(600)
}

async function main() {
  await ensureDir(outputDir)
  const { chromium } = await loadPlaywright()
  const server = await createServer()
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })

  const summary = {
    generatedAt: new Date().toISOString(),
    popup: [],
    sidebar: [],
  }

  try {
    const popupBefore = await context.newPage()
    const popupBeforeConsole = []
    popupBefore.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        popupBeforeConsole.push({ type: message.type(), text: message.text() })
      }
    })
    await popupBefore.goto(`http://127.0.0.1:${port}/popup.html`)
    await waitForPageStable(popupBefore)
    await popupBefore.screenshot({
      path: path.join(outputDir, 'extension-popup-login.png'),
      fullPage: true,
    })
    summary.popup.push({
      state: 'login',
      consoleMessages: popupBeforeConsole,
      metrics: await collectMetrics(popupBefore),
      bodyText: await popupBefore.locator('body').innerText(),
    })
    await popupBefore.close()

    const sidebar = await context.newPage()
    const sidebarConsole = []
    sidebar.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        sidebarConsole.push({ type: message.type(), text: message.text() })
      }
    })
    await sidebar.goto(`http://127.0.0.1:${port}/sidebar.html`)
    await sidebar.waitForSelector('#salonzap-extension-root')
    await waitForPageStable(sidebar)
    await sidebar.screenshot({
      path: path.join(outputDir, 'extension-sidebar-login.png'),
      fullPage: true,
    })

    const root = sidebar.locator('#salonzap-extension-root')

    await root.getByLabel('API URL').fill(badApiUrl)
    await root.getByLabel('E-mail').fill(credentials.email)
    await root.getByLabel('Senha').fill(credentials.password)
    await root.getByRole('button', { name: 'Conectar extensao' }).click()
    await root.locator('.szp-feedback.is-danger').waitFor({ timeout: 10000 })
    await sidebar.screenshot({
      path: path.join(outputDir, 'extension-sidebar-error.png'),
      fullPage: true,
    })

    summary.sidebar.push({
      state: 'error',
      consoleMessages: [...sidebarConsole],
      metrics: await collectMetrics(sidebar),
      feedback: await root.locator('.szp-feedback').innerText(),
    })

    sidebarConsole.length = 0

    await root.getByLabel('API URL').fill(apiBaseUrl)
    await root.getByRole('button', { name: 'Conectar extensao' }).click()
    await root.getByText('Perfil CRM').waitFor({ timeout: 15000 })
    await waitForPageStable(sidebar)
    await sidebar.screenshot({
      path: path.join(outputDir, 'extension-sidebar-authenticated.png'),
      fullPage: true,
    })

    summary.sidebar.push({
      state: 'authenticated',
      consoleMessages: [...sidebarConsole],
      metrics: await collectMetrics(sidebar),
      bodyText: await root.innerText(),
    })

    const popupAfter = await context.newPage()
    const popupAfterConsole = []
    popupAfter.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        popupAfterConsole.push({ type: message.type(), text: message.text() })
      }
    })
    await popupAfter.goto(`http://127.0.0.1:${port}/popup.html`)
    await waitForPageStable(popupAfter)
    await popupAfter.screenshot({
      path: path.join(outputDir, 'extension-popup-authenticated.png'),
      fullPage: true,
    })

    summary.popup.push({
      state: 'authenticated',
      consoleMessages: popupAfterConsole,
      metrics: await collectMetrics(popupAfter),
      bodyText: await popupAfter.locator('body').innerText(),
    })

    await popupAfter.close()
    await sidebar.close()

    await fs.writeFile(
      path.join(outputDir, 'extension-summary.json'),
      JSON.stringify(summary, null, 2),
      'utf8',
    )
  } finally {
    await context.close().catch(() => undefined)
    await browser.close().catch(() => undefined)
    await new Promise((resolve) => server.close(resolve))
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
