import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const OUT =
  process.env.SHOT_DIR ??
  '/tmp/claude-1000/-home-development1-Desktop-Polycon-Kpi/80863415-050d-43c5-9440-7d9d8c97e497/scratchpad/pdf'
const BASE = process.env.BASE_URL ?? 'http://localhost:3000/'

mkdirSync(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

await page.goto(BASE, { waitUntil: 'networkidle' })
await page.waitForTimeout(600)
await page.getByRole('button', { name: /Hirslandenklinik/ }).first().click()
await page.waitForTimeout(1300)
await page.getByRole('button', { name: 'Report', exact: true }).first().click()
await page.waitForTimeout(1000)

// Inspect the page as the printer sees it.
await page.emulateMedia({ media: 'print' })
await page.waitForTimeout(400)

const audit = await page.evaluate(() => {
  const findings = []

  // Anything still clipping its content will lose rows in the PDF.
  for (const el of document.querySelectorAll('*')) {
    const style = getComputedStyle(el)
    if (style.display === 'none') continue
    const clips =
      style.overflowY === 'auto' ||
      style.overflowY === 'scroll' ||
      style.overflowX === 'auto' ||
      style.overflowX === 'scroll'
    if (clips && (el.scrollHeight > el.clientHeight + 2 || el.scrollWidth > el.clientWidth + 2)) {
      findings.push({
        kind: 'CLIPPED',
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 50),
        hidden: `${el.scrollHeight - el.clientHeight}px tall / ${el.scrollWidth - el.clientWidth}px wide`,
      })
    }
    if (style.position === 'sticky' || style.position === 'fixed') {
      findings.push({
        kind: style.position.toUpperCase(),
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 50),
      })
    }
  }

  // Content wider than A4's printable width will be cut off.
  const A4_CONTENT_PX = 794 - 2 * 45 // 210mm at 96dpi, minus 12mm margins
  const wide = []
  for (const el of document.querySelectorAll('table, .card, article, section')) {
    const r = el.getBoundingClientRect()
    if (r.width > A4_CONTENT_PX + 4) {
      wide.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className || '').toString().slice(0, 50),
        w: Math.round(r.width),
      })
    }
  }

  return { findings: findings.slice(0, 20), wide: wide.slice(0, 12), a4: A4_CONTENT_PX }
})

console.log('A4 printable width ~', audit.a4, 'px @96dpi')
console.log('\n--- clipping / positioning in print ---')
if (!audit.findings.length) console.log('  none')
for (const f of audit.findings)
  console.log(`  ${f.kind.padEnd(8)} <${f.tag}> ${f.cls} ${f.hidden ?? ''}`)

console.log('\n--- blocks wider than the printable area ---')
if (!audit.wide.length) console.log('  none')
for (const w of audit.wide) console.log(`  ${w.w}px <${w.tag}> ${w.cls}`)

await page.pdf({
  path: `${OUT}/report.pdf`,
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
})
console.log(`\nPDF written to ${OUT}/report.pdf`)

await browser.close()
