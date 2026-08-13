import { chromium } from '@playwright/test'

const BASE = process.env.BASE ?? 'http://localhost:4180'
const OUT = process.env.OUT ?? 'screenshots'

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 1000 },
  { name: 'mobile', width: 375, height: 812 },
]

const browser = await chromium.launch()
const errors = []

for (const vp of VIEWPORTS) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } })
  page.on('console', (m) => m.type() === 'error' && errors.push(`${vp.name}: ${m.text()}`))
  page.on('pageerror', (e) => errors.push(`${vp.name}: ${e.message}`))

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)

  // The app opens on the portfolio; the capacity chart lives inside a project.
  await page.locator('main button').first().click()
  await page.waitForTimeout(800)

  // The reading guide must state the count of problem weeks up front.
  const guide = await page.locator('text=/weeks/i').first().innerText().catch(() => '(none)')
  console.log(`\n[${vp.name}] guide: ${guide.replace(/\s+/g, ' ').slice(0, 90)}`)

  await page.screenshot({ path: `${OUT}/week-${vp.name}-1-chart.png`, fullPage: false })

  // Find a breaching week (its bar carries a +N label) and open it.
  const overBar = page.locator('button[aria-label*="too many"]').first()
  const hasOver = (await overBar.count()) > 0
  const target = hasOver ? overBar : page.locator('button[aria-label*="planned against"]').first()

  const label = await target.getAttribute('aria-label')
  console.log(`[${vp.name}] clicking: ${label?.slice(0, 80)}...`)
  await target.scrollIntoViewIfNeeded()
  await target.click()
  await page.waitForTimeout(500)

  const panel = page.locator('section[aria-label*="detail"]')
  const visible = await panel.isVisible().catch(() => false)
  console.log(`[${vp.name}] panel visible: ${visible}`)

  if (visible) {
    const text = (await panel.innerText()).replace(/\s+/g, ' ')
    console.log(`[${vp.name}] verdict : ${text.slice(0, 150)}`)
    const rows = await panel.locator('tbody tr').count()
    const moulds = await panel.locator('ul li').count()
    console.log(`[${vp.name}] moulds=${moulds} productRows=${rows}`)
    await panel.scrollIntoViewIfNeeded()
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${OUT}/week-${vp.name}-2-detail.png`, fullPage: false })

    // Close must return to the chart with no filter left applied.
    await panel.getByRole('button', { name: /close/i }).click()
    await page.waitForTimeout(400)
    console.log(`[${vp.name}] closed ok: ${!(await panel.isVisible().catch(() => false))}`)
  }

  // No sideways scroll at any width.
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )
  console.log(`[${vp.name}] horizontal overflow: ${overflow}px ${overflow > 1 ? 'FAIL' : 'ok'}`)
  if (overflow > 1) errors.push(`${vp.name}: horizontal overflow ${overflow}px`)

  await page.close()
}

await browser.close()
console.log(`\nerrors: ${errors.length ? errors.join('\n  ') : 'none'}`)
