import { chromium } from 'playwright'
import { writeFileSync } from 'fs'

const BASE = 'http://localhost:3000'
const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }) // iPhone 14
const page = await ctx.newPage()

async function shot(name) {
  await page.waitForTimeout(800)
  await page.screenshot({ path: `/tmp/gf-${name}.png`, fullPage: false })
  console.log(`✅ /tmp/gf-${name}.png`)
}

// 1. Login page
await page.goto(`${BASE}/login`)
await shot('01-login')

// 2. Login as admin
await page.fill('input[type="email"]', 'admin@gianfranco.com')
await page.fill('input[type="password"]', '1234')
await page.click('button[type="submit"]')
await page.waitForURL('**/admin', { timeout: 8000 })
await shot('02-admin-dashboard')

// 3. Tables map
await page.goto(`${BASE}/tables`)
await page.waitForLoadState('networkidle')
await shot('03-table-map')

// 4. Click on mesa G1
await page.locator('button').filter({ hasText: 'G1' }).first().click()
await page.waitForTimeout(500)
await shot('04-table-selected')

// 5. Click Ocupar + Pedido → order page
await page.locator('button').filter({ hasText: /Ocupar/i }).first().click()
await page.waitForURL('**/order/**', { timeout: 6000 })
await shot('05-order-page')

// 6. Click Favoritos tab
await page.locator('button').filter({ hasText: /Favoritos/i }).first().click()
await page.waitForTimeout(400)
await shot('06-order-favorites')

// 7. Click Cappuccino
await page.locator('button').filter({ hasText: 'Cappuccino' }).first().click()
await page.waitForTimeout(400)
await shot('07-modifier-sheet')

// 8. Add to cart
await page.locator('button').filter({ hasText: /Agregar/i }).first().click()
await page.waitForTimeout(400)

// Add Pizza Garlic
await page.locator('button').filter({ hasText: /Pizzas/i }).first().click()
await page.waitForTimeout(300)
await page.locator('button').filter({ hasText: /Pizza Garlic/i }).first().click()
await page.waitForTimeout(300)
await page.locator('button').filter({ hasText: /Agregar/i }).first().click()
await page.waitForTimeout(400)
await shot('08-order-with-items')

// 9. Send order
await page.locator('button').filter({ hasText: /Enviar pedido/i }).first().click()
await page.waitForURL('**/tables', { timeout: 8000 })
await page.waitForLoadState('networkidle')
await shot('09-tables-after-order')

// 10. Bar view
await page.goto(`${BASE}/bar`)
await page.waitForLoadState('networkidle')
await page.waitForTimeout(1000)
await shot('10-bar-view')

// 11. Kitchen view
await page.goto(`${BASE}/kitchen`)
await page.waitForLoadState('networkidle')
await page.waitForTimeout(1000)
await shot('11-kitchen-view')

// 12. Admin desktop view
const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const dpage = await desktop.newPage()
await dpage.goto(`${BASE}/login`)
await dpage.fill('input[type="email"]', 'admin@gianfranco.com')
await dpage.fill('input[type="password"]', '1234')
await dpage.click('button[type="submit"]')
await dpage.waitForURL('**/admin', { timeout: 8000 })
await dpage.waitForTimeout(800)
await dpage.screenshot({ path: '/tmp/gf-12-admin-desktop.png' })
console.log('✅ /tmp/gf-12-admin-desktop.png')

await browser.close()
console.log('Done')
