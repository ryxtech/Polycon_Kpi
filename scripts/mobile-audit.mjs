import { chromium, devices } from '@playwright/test'
import { mkdirSync } from 'node:fs'

const OUT =
  process.env.SHOT_DIR ??
  '/tmp/claude-1000/-home-development1-Desktop-Polycon-Kpi/80863415-050d-43c5-9440-7d9d8c97e497/scratchpad/mobile'
const BASE = process.env.BASE_URL ?? 'http://localhost:3000/'

mkdirSync(OUT, { recursive: true })

const VIEWPORTS = [
  { name: 'iphone-se', width: 375, height: 667 },
  { name: 'iphone-14', width: 390, height: 844 },
  { name: 'pixel-7', width: 412, height: 915 },
  { name: 'ipad-mini', width: 768, height: 1024 },
]

const browser = await chromium.launch()
const problems = []

/** Elements wider than the viewport are what cause page-level sideways scroll. */
async function auditPage(page, label, viewport) {
  const report = await page.evaluate((vw) => {
    const doc = document.documentElement
    const overflowing = []

    for (const el of document.body.querySelectorAll('*')) {
      const rect = el.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) continue
      // Ignore anything inside a container that scrolls on purpose.
      let scrollParent = el.parentElement
      let inScroller = false
      while (scrollParent && scrollParent !== document.body) {
        const overflowX = getComputedStyle(scrollParent).overflowX
        if (overflowX === 'auto' || overflowX === 'scroll') {
          inScroller = true
          break
        }
        scrollParent = scrollParent.parentElement
      }
      if (inScroller) continue

      if (rect.right > vw + 1 || rect.left < -1) {
        overflowing.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className || '').toString().slice(0, 60),
          right: Math.round(rect.right),
          text: (el.textContent || '').trim().slice(0, 40),
        })
      }
    }

    // Text smaller than 12px is unreadable on a phone.
    const tiny = []
    for (const el of document.body.querySelectorAll('*')) {
      if (!el.children.length && (el.textContent || '').trim()) {
        const size = Number.parseFloat(getComputedStyle(el).fontSize)
        if (size && size < 10) {
          tiny.push({ size, text: (el.textContent || '').trim().slice(0, 30) })
        }
      }
    }

    // Interactive targets below the 44px minimum.
    const small = []
    for (const el of document.body.querySelectorAll(
      'button, a, select, input, [role="button"]',
    )) {
      let r = el.getBoundingClientRect()
      if (r.width === 0 || r.height === 0) continue

      /*
       * A control wrapped in its own label is tapped through the label, so the
       * label's box is the real target. Measuring the bare input reported a
       * 20px checkbox as unreachable when the whole 44px row already toggles
       * it — a false positive that hides the genuine ones.
       */
      const label = el.closest('label')
      if (label && label.contains(el)) {
        const lr = label.getBoundingClientRect()
        if (lr.height > r.height) r = lr
      }

      if (r.height < 40) {
        small.push({
          tag: el.tagName.toLowerCase(),
          h: Math.round(r.height),
          w: Math.round(r.width),
          text: (el.textContent || el.getAttribute('aria-label') || '')
            .trim()
            .slice(0, 30),
        })
      }
    }

    return {
      scrollW: doc.scrollWidth,
      clientW: doc.clientWidth,
      overflowing: overflowing.slice(0, 6),
      tiny: tiny.slice(0, 5),
      small: small.slice(0, 8),
    }
  }, viewport.width)

  const horizontalScroll = report.scrollW > report.clientW + 1

  if (horizontalScroll || report.overflowing.length || report.small.length) {
    problems.push({ viewport: viewport.name, label, horizontalScroll, ...report })
  }

  return { horizontalScroll, ...report }
}

for (const viewport of VIEWPORTS) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 2,
    isMobile: viewport.width < 700,
    hasTouch: viewport.width < 700,
    userAgent: devices['iPhone 13'].userAgent,
  })
  const page = await context.newPage()

  await page.goto(BASE, { waitUntil: 'networkidle' })
  await page.waitForTimeout(600)

  const results = []
  results.push([
    'portfolio',
    await auditPage(page, 'portfolio', viewport),
  ])
  await page.screenshot({
    path: `${OUT}/${viewport.name}-01-portfolio.png`,
    fullPage: true,
  })

  await page.getByRole('button', { name: /Hirslandenklinik/ }).first().click()
  await page.waitForTimeout(1400)
  results.push(['overview', await auditPage(page, 'overview', viewport)])
  await page.screenshot({
    path: `${OUT}/${viewport.name}-02-overview.png`,
    fullPage: true,
  })

  // The rail is hidden below md; check the pages are reachable at all.
  const railVisible = await page
    .locator('nav[aria-label="Report pages"]')
    .first()
    .isVisible()
    .catch(() => false)

  for (const label of ['Production plan', 'Mould readiness', 'Detailed schedule', 'Raw data', 'Data readiness', 'Report']) {
    const target = page.getByRole('button', { name: label, exact: true }).first()
    if (!(await target.isVisible().catch(() => false))) {
      results.push([label.toLowerCase(), { unreachable: true, scrollW: 0, clientW: 0, overflowing: [], tiny: [], small: [] }])
      continue
    }
    await target.click()
    await page.waitForTimeout(900)
    results.push([label.toLowerCase(), await auditPage(page, label, viewport)])
    await page.screenshot({
      path: `${OUT}/${viewport.name}-${label.replace(/\s+/g, '-').toLowerCase()}.png`,
      fullPage: true,
    })
  }

  console.log(`\n### ${viewport.name} (${viewport.width}px)`)
  console.log(`  report-page nav visible: ${railVisible}`)
  for (const [name, r] of results) {
    if (r.unreachable) {
      console.log(`  ${name.padEnd(16)} UNREACHABLE ⚠`)
      continue
    }
    console.log(
      `  ${name.padEnd(16)} hscroll=${r.horizontalScroll ? 'YES ⚠' : 'no'}  ` +
        `scrollW=${r.scrollW}/${r.clientW}  overflow=${r.overflowing.length}  ` +
        `tinyText=${r.tiny.length}  smallTargets=${r.small.length}`,
    )
    for (const o of r.overflowing)
      console.log(`      overflow: <${o.tag}> right=${o.right} "${o.text}"`)
    for (const s of r.small)
      console.log(`      target ${s.w}x${s.h} <${s.tag}> "${s.text}"`)
  }

  await context.close()
}

console.log('\n=== SUMMARY ===')
console.log(problems.length === 0 ? 'No issues found.' : `${problems.length} page/viewport combos with findings (see above)`)
await browser.close()
