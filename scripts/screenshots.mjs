import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const OUT =
  process.env.SHOT_DIR ??
  '/tmp/claude-1000/-home-development1-Desktop-Polycon-Kpi/80863415-050d-43c5-9440-7d9d8c97e497/scratchpad/shots'
const BASE = process.env.BASE_URL ?? 'http://localhost:4173/'

mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1512, height: 1000 } })

const errors = []
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text())
})
page.on('pageerror', (e) => errors.push(`PAGEERROR: ${e.message}`))

const shot = async (name, opts = {}) =>
  page.screenshot({ path: `${OUT}/${name}.png`, fullPage: true, ...opts })

const openPage = async (label) => {
  await page.getByRole('button', { name: label, exact: true }).click()
  await page.waitForTimeout(1100)
}

await page.goto(BASE, { waitUntil: 'networkidle' })

// Capture the boot screen mid-run, then wait for it to hand over.
await page.waitForTimeout(650)
await shot('00-boot', { fullPage: false })
await page.waitForTimeout(1600)
await shot('01-portfolio')

// Portfolio rows are role=button; open Hirslandenklinik.
await page.getByRole('button', { name: /Hirslandenklinik/ }).first().click()
await page.waitForTimeout(1300)
await shot('02-overview')

await openPage('Production plan')
await shot('03-plan')

await openPage('Mould readiness')
await shot('04-moulds')

await openPage('Detail')
await shot('05-details')

await openPage('Report')
await shot('06-export')

// Mould drill-through drawer
await openPage('Mould readiness')
await page.getByRole('button', { name: /^NHK7/ }).first().click()
await page.waitForTimeout(600)
await shot('07-drawer', { fullPage: false })
await page.keyboard.press('Escape')
await page.waitForTimeout(400)

// Beethovenstrasse — the project whose risks actually fire
await page.getByRole('button', { name: 'Portfolio', exact: true }).click()
await page.waitForTimeout(900)
await page.getByRole('button', { name: /Beethovenstrasse/ }).first().click()
await page.waitForTimeout(1300)
await shot('08-bees-overview')

await openPage('Mould readiness')
await shot('09-bees-moulds')

// Import screen
await page.getByRole('button', { name: 'Import data' }).click()
await page.waitForTimeout(700)
await shot('10-intake')

// Narrow viewport — the rail collapses below md
await page.setViewportSize({ width: 390, height: 900 })
await page.getByRole('button', { name: 'Portfolio', exact: true }).click()
await page.waitForTimeout(1000)
await shot('11-mobile-portfolio')

console.log('\nCONSOLE ERRORS:', errors.length ? errors : 'none')
await browser.close()
