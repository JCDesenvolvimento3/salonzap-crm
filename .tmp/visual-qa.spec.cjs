const fs = require('node:fs/promises')
const path = require('node:path')
const { test, chromium } = require('playwright/test')

const webBaseUrl = 'http://localhost:3000'
const apiBaseUrl = 'http://localhost:3333'
const extensionDistPath = path.resolve('apps/extension/dist')
const outputDir = path.resolve('.tmp/qa-artifacts')
const sessionStorageKey = 'salonzap:session'

const credentials = {
  email: 'admin@salonzap.local',
  password: '123456',
}

const viewports = [
  { name: 'desktop', width: 1440, height: 900, openMobileMenu: false },
  { name: 'tablet', width: 1024, height: 768, openMobileMenu: false },
  { name: 'mobile', width: 390, height: 844, openMobileMenu: true },
]

const routes = [
  { name: 'dashboard', path: '/dashboard' },
  { name: 'contacts', path: '/contacts' },
  { name: 'kanban', path: '/kanban' },
  { name: 'campaigns', path: '/campaigns' },
  { name: 'quick-replies', path: '/quick-replies' },
  { name: 'reminders', path: '/reminders' },
  { name: 'settings', path: '/settings' },
]

async function ensureDir(target) {
  await fs.mkdir(target, { recursive: true })
}

async function getSession() {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  })

  if (!response.ok) {
    throw new Error(`Failed to authenticate for QA: ${response.status}`)
  }

  return response.json()
}

async function waitForPageStable(page) {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
}

async function collectMetrics(page) {
  return page.evaluate(() => {
    const overflowElements = Array.from(document.querySelectorAll('body *'))
      .map((element) => {
        if (!(element instanceof HTMLElement)) {
          return null
        }

        const style = window.getComputedStyle(element)
        if (style.display === 'none' || style.visibility === 'hidden') {
          return null
        }

        const horizontalOverflow = element.scrollWidth - element.clientWidth
        const rect = element.getBoundingClientRect()

        if (
          horizontalOverflow < 12 &&
          rect.right <= window.innerWidth + 4 &&
          rect.left >= -4
        ) {
          return null
        }

        const label =
          element.getAttribute('aria-label') ||
          element.getAttribute('title') ||
          element.innerText.trim().slice(0, 80) ||
          element.className ||
          element.tagName.toLowerCase()

        return {
          tag: element.tagName.toLowerCase(),
          label,
          horizontalOverflow,
          right: rect.right,
          left: rect.left,
          width: rect.width,
        }
      })
      .filter(Boolean)
      .slice(0, 8)

    return {
      title: document.title,
      bodyTextLength: document.body.innerText.trim().length,
      nextOverlay: Boolean(document.querySelector('[data-nextjs-dialog]')),
      horizontalPageOverflow: document.documentElement.scrollWidth - window.innerWidth,
      overflowElements,
    }
  })
}

test.setTimeout(300000)

test('visual qa web and extension', async ({ browser }) => {
  await ensureDir(outputDir)
  const session = await getSession()
  const summary = {
    generatedAt: new Date().toISOString(),
    loginResult: null,
    webResults: [],
    extensionResults: [],
  }

  {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    })
    const page = await context.newPage()
    const consoleMessages = []

    page.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        consoleMessages.push({ type: message.type(), text: message.text() })
      }
    })

    await page.goto(`${webBaseUrl}/login`)
    await waitForPageStable(page)

    await page.screenshot({
      path: path.join(outputDir, 'web-login-desktop.png'),
      fullPage: true,
    })

    const metrics = await collectMetrics(page)

    await page.getByLabel('E-mail').fill(credentials.email)
    await page.getByLabel('Senha').fill(credentials.password)
    await page.getByRole('button', { name: 'Entrar no SalonZap' }).click()
    await page.waitForURL('**/dashboard')
    await waitForPageStable(page)
    await page.screenshot({
      path: path.join(outputDir, 'web-login-submit-dashboard.png'),
      fullPage: true,
    })

    summary.loginResult = {
      route: 'login',
      viewport: 'desktop',
      consoleMessages,
      metrics,
    }

    await context.close()
  }

  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
    })

    await context.addInitScript(
      ([key, payload]) => {
        window.localStorage.setItem(key, JSON.stringify(payload))
      },
      [sessionStorageKey, session],
    )

    for (const route of routes) {
      const page = await context.newPage()
      const consoleMessages = []

      page.on('console', (message) => {
        if (message.type() === 'error' || message.type() === 'warning') {
          consoleMessages.push({ type: message.type(), text: message.text() })
        }
      })

      await page.goto(`${webBaseUrl}${route.path}`)
      await waitForPageStable(page)

      const metrics = await collectMetrics(page)

      await page.screenshot({
        path: path.join(outputDir, `web-${route.name}-${viewport.name}.png`),
        fullPage: true,
      })

      if (viewport.openMobileMenu) {
        const firstButton = page.locator('header button').first()
        if (await firstButton.isVisible().catch(() => false)) {
          await firstButton.click()
          await page.waitForTimeout(350)
          await page.screenshot({
            path: path.join(outputDir, `web-${route.name}-${viewport.name}-menu.png`),
            fullPage: true,
          })
        }
      }

      summary.webResults.push({
        route: route.name,
        viewport: viewport.name,
        consoleMessages,
        metrics,
      })

      await page.close()
    }

    await context.close()
  }

  {
    const userDataDir = path.resolve('.tmp/playwright-extension-profile')
    await ensureDir(userDataDir)

    const extensionContext = await chromium.launchPersistentContext(userDataDir, {
      headless: true,
      viewport: { width: 1440, height: 900 },
      args: [
        `--disable-extensions-except=${extensionDistPath}`,
        `--load-extension=${extensionDistPath}`,
      ],
    })

    const serviceWorker = await extensionContext.waitForEvent('serviceworker')
    const extensionId = serviceWorker.url().split('/')[2]
    const popupUrl = `chrome-extension://${extensionId}/index.html`

    const popup = await extensionContext.newPage()
    const popupConsole = []
    popup.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        popupConsole.push({ type: message.type(), text: message.text() })
      }
    })

    await popup.goto(popupUrl)
    await waitForPageStable(popup)
    await popup.screenshot({
      path: path.join(outputDir, 'extension-popup.png'),
      fullPage: true,
    })

    summary.extensionResults.push({
      surface: 'popup',
      consoleMessages: popupConsole,
      metrics: await collectMetrics(popup),
    })

    const whatsapp = await extensionContext.newPage()
    const whatsappConsole = []
    whatsapp.on('console', (message) => {
      if (message.type() === 'error' || message.type() === 'warning') {
        whatsappConsole.push({ type: message.type(), text: message.text() })
      }
    })

    await whatsapp.goto('https://web.whatsapp.com/')
    await whatsapp.waitForTimeout(5000)

    const root = whatsapp.locator('#salonzap-extension-root')
    await root.waitFor({ state: 'visible', timeout: 20000 })
    await whatsapp.screenshot({
      path: path.join(outputDir, 'extension-whatsapp-sidebar-login.png'),
      fullPage: true,
    })

    await root.getByLabel('API URL').fill('http://localhost:9999')
    await root.getByLabel('E-mail').fill(credentials.email)
    await root.getByLabel('Senha').fill(credentials.password)
    await root.getByRole('button', { name: 'Conectar extensao' }).click()
    await whatsapp.waitForTimeout(1500)
    await whatsapp.screenshot({
      path: path.join(outputDir, 'extension-whatsapp-sidebar-error.png'),
      fullPage: true,
    })

    await root.getByLabel('API URL').fill(apiBaseUrl)
    await root.getByRole('button', { name: 'Conectar extensao' }).click()
    await whatsapp.waitForTimeout(2200)
    await whatsapp.screenshot({
      path: path.join(outputDir, 'extension-whatsapp-sidebar-authenticated.png'),
      fullPage: true,
    })

    summary.extensionResults.push({
      surface: 'sidebar',
      consoleMessages: whatsappConsole,
      metrics: await collectMetrics(whatsapp),
      extensionRootText: await root.innerText(),
    })

    await popup.close()
    await whatsapp.close()
    await extensionContext.close()
  }

  await fs.writeFile(
    path.join(outputDir, 'summary.json'),
    JSON.stringify(summary, null, 2),
    'utf8',
  )
})
