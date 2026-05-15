import fs from 'node:fs/promises'
import path from 'node:path'
import { chromium } from 'playwright'

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
        const html = element
        if (!(html instanceof HTMLElement)) {
          return null
        }

        const style = window.getComputedStyle(html)
        if (style.display === 'none' || style.visibility === 'hidden') {
          return null
        }

        const horizontalOverflow = html.scrollWidth - html.clientWidth
        const rect = html.getBoundingClientRect()

        if (
          horizontalOverflow < 12 &&
          rect.right <= window.innerWidth + 4 &&
          rect.left >= -4
        ) {
          return null
        }

        const label =
          html.getAttribute('aria-label') ||
          html.getAttribute('title') ||
          html.innerText.trim().slice(0, 80) ||
          html.className ||
          html.tagName.toLowerCase()

        return {
          tag: html.tagName.toLowerCase(),
          label,
          horizontalOverflow,
          right: rect.right,
          left: rect.left,
          width: rect.width,
        }
      })
      .filter(Boolean)
      .slice(0, 8)

    const clickableOverflow = Array.from(
      document.querySelectorAll('button, a, input, select, textarea'),
    )
      .map((element) => {
        const html = element
        if (!(html instanceof HTMLElement)) {
          return null
        }

        const rect = html.getBoundingClientRect()
        if (rect.width <= 0 || rect.height <= 0) {
          return null
        }

        if (rect.right > window.innerWidth + 2 || rect.left < -2) {
          return {
            tag: html.tagName.toLowerCase(),
            text: html.innerText.trim().slice(0, 60) || html.getAttribute('aria-label') || '',
            right: rect.right,
            left: rect.left,
          }
        }

        return null
      })
      .filter(Boolean)
      .slice(0, 8)

    return {
      title: document.title,
      bodyTextLength: document.body.innerText.trim().length,
      nextOverlay: Boolean(document.querySelector('[data-nextjs-dialog]')),
      horizontalPageOverflow: document.documentElement.scrollWidth - window.innerWidth,
      overflowElements,
      clickableOverflow,
    }
  })
}

async function qaLoginScreen(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  })
  const page = await context.newPage()
  const consoleMessages = []

  page.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      consoleMessages.push({
        type: message.type(),
        text: message.text(),
      })
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

  await context.close()

  return {
    route: 'login',
    viewport: 'desktop',
    consoleMessages,
    metrics,
  }
}

async function qaWebRoutes(browser, session) {
  const results = []

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
          consoleMessages.push({
            type: message.type(),
            text: message.text(),
          })
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

      results.push({
        route: route.name,
        viewport: viewport.name,
        consoleMessages,
        metrics,
      })

      await page.close()
    }

    await context.close()
  }

  return results
}

async function qaExtension() {
  const userDataDir = path.resolve('.tmp/playwright-extension-profile')
  await ensureDir(userDataDir)

  const context = await chromium.launchPersistentContext(userDataDir, {
    headless: true,
    viewport: { width: 1440, height: 900 },
    args: [
      `--disable-extensions-except=${extensionDistPath}`,
      `--load-extension=${extensionDistPath}`,
    ],
  })

  const serviceWorker = await context.waitForEvent('serviceworker')
  const extensionId = serviceWorker.url().split('/')[2]
  const popupUrl = `chrome-extension://${extensionId}/index.html`
  const results = []

  const popup = await context.newPage()
  const popupConsole = []
  popup.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      popupConsole.push({
        type: message.type(),
        text: message.text(),
      })
    }
  })

  await popup.goto(popupUrl)
  await waitForPageStable(popup)
  await popup.screenshot({
    path: path.join(outputDir, 'extension-popup.png'),
    fullPage: true,
  })

  results.push({
    surface: 'popup',
    consoleMessages: popupConsole,
    metrics: await collectMetrics(popup),
  })

  const whatsapp = await context.newPage()
  const whatsappConsole = []
  whatsapp.on('console', (message) => {
    if (message.type() === 'error' || message.type() === 'warning') {
      whatsappConsole.push({
        type: message.type(),
        text: message.text(),
      })
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
  await whatsapp.waitForTimeout(1200)
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

  results.push({
    surface: 'sidebar',
    consoleMessages: whatsappConsole,
    metrics: await collectMetrics(whatsapp),
    extensionRootText: await root.innerText(),
  })

  await popup.close()
  await whatsapp.close()
  await context.close()

  return results
}

async function main() {
  await ensureDir(outputDir)
  const session = await getSession()
  const browser = await chromium.launch({ headless: true })

  try {
    const loginResult = await qaLoginScreen(browser)
    const webResults = await qaWebRoutes(browser, session)
    const extensionResults = await qaExtension()

    const summary = {
      generatedAt: new Date().toISOString(),
      loginResult,
      webResults,
      extensionResults,
    }

    await fs.writeFile(
      path.join(outputDir, 'summary.json'),
      JSON.stringify(summary, null, 2),
      'utf8',
    )
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
