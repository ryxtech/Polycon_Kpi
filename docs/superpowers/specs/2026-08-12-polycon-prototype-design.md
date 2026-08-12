# Polycon Production Intelligence — Client Prototype Design

**Date:** 2026-08-12
**Status:** Implemented
**Revised:** 2026-08-12, after implementation — see §5 and §2.3
**Supersedes:** the Alpine.js single-file prototype in `index.html`

---

## 1. Purpose

Turn Polycon's existing production-planning data into a customer-facing project
intelligence dashboard, while Excel remains the operational source of truth.

The positioning is deliberate. Not "we convert your Excel into a dashboard" but
"we transform existing production planning data into project intelligence,
keeping Excel as the source." The product's value is the *crossing* of columns
the spreadsheet never joins.

---

## 2. Source material

Four files in `reenquirydevelopmentofaproductionstatusplanning/`:

| File | Role |
| --- | --- |
| `Hirslandenklinik - OVERVIEW - 11.8.2026.xlsx` | Live dataset, parsed at runtime |
| `Beethovenstrasse_form_schedule_EN.pdf` | Mould/form schedule — process constants + risk states |
| `Beethovenstrasse_production_schedule_EN.pdf` | Element production schedule — priority grouping |
| `project Warren_Street production status.jpg` | Polycon's existing client-reporting design language |

### 2.1 Verified Hirslandenklinik figures

Computed directly from `List1` (107 data rows):

- **245** pieces total
- **88** unique items
- **10** moulds — NHK1 … NHK10
- **4** call-offs — 101 / 45 / 40 / 59 pcs respectively

Per-mould rollup. **Products** counts distinct items; **entries** counts sheet
rows. They differ where an item is called off more than once, and the two must
never be conflated — products reconcile to 88, entries to 107:

| Mould | Products | Entries | Pcs | `MOLD WILL BE DONE` |
| --- | ---: | ---: | ---: | --- |
| NHK1 | 6 | 6 | 7 | 2026-08-20 |
| NHK2 | 11 | 11 | 15 | 2026-08-20 |
| NHK3 | 6 | 6 | 16 | 2026-08-28 |
| NHK4 | 11 | 14 | 47 | READY TO SPRAY |
| NHK5 | 9 | 9 | 11 | READY TO SPRAY |
| NHK6 | 11 | 21 | 40 | READY TO SPRAY |
| NHK7 | 31 | 37 | 104 | READY TO SPRAY |
| NHK8 | 1 | 1 | 1 | 2026-08-27 |
| NHK9 | 1 | 1 | 1 | 2026-09-01 |
| NHK10 | 1 | 1 | 3 | 2026-08-13 |
| **Total** | **88** | **107** | **245** | |

The brief's mould table quotes the entries column (NHK7 as "37 product items").
Both figures are shown in the UI so neither reading is lost.

### 2.2 Process constants (from the form schedule PDF)

- Production capacity: **3 forms simultaneously / day**
- Material preparation: **1 day**
- Form production: **2 days**
- Three risk states: *on schedule* · *limited buffer for inspection* ·
  *form will not be ready on time (by N working days)*
- Daily workload is expressed as a fraction of capacity: `3/3`, `1/3`, `0/3`

### 2.3 Beethovenstrasse dataset (encoded from the form schedule only)

13 forms (BES4 does not appear), 66 products, 234 pcs.

**This project carries no element-level rows.** The only element data available
is the plotted Gantt in the production schedule PDF. Transcribing quantities
back off that image produced per-form totals that contradicted the form
schedule's own published figures — BES10 came out at 36 pcs against a published
6 — so the transcription was discarded rather than shipped. A fabricated row is
worse than an absent one.

Consequently the project's headline figures are read straight from the form
schedule, no mould buffers are derived for it, and the timeline and raw-data
views show an explicit empty state naming the reason.

| Form | Priority | Products | Pcs | Status |
| --- | --- | ---: | ---: | --- |
| BES1 | 1 | 5 | 6 | on schedule |
| BES2 | 1 | 5 | 6 | on schedule |
| BES3 | 1 | 14 | 52 | limited buffer |
| BES5 | 1 | 2 | 6 | limited buffer |
| BES6 | 1 | 1 | 10 | limited buffer |
| BES8 | 1 | 4 | 14 | on schedule |
| BES9 | 1 | 1 | 38 | late — 1 working day |
| BES10 | 1 | 3 | 6 | on schedule |
| BES11 | 4 | 2 | 23 | late — 1 working day |
| BES7 | 5 | 3 | 14 | late — 3 working days |
| BES12 | — | 14 | 20 | late — 3 working days |
| BES13 | — | 5 | 16 | late — 3 working days |
| BES14 | — | 7 | 23 | late — 5 working days |

---

## 3. Data hazards

Four properties of the real file that the implementation must handle. Each has a
dedicated test.

1. **`MOLD WILL BE DONE` is not a date column.** 81 of 107 rows contain the
   string `READY TO SPRAY`. Only 5 distinct dates exist. The field is a union of
   `{ kind: 'ready' } | { kind: 'date', value: Date }`.

2. **Week numbers wrap the year boundary.** Production runs weeks 35 → 53, then
   1 → 4 in 2027. Naive numeric sorting places week 2 before week 35 and
   scrambles every timeline. The wrap pivot is **inferred** from the schedule —
   a set containing both late-year and early-year weeks has wrapped — rather
   than configured, so an uploaded workbook for an unknown project orders
   correctly with no flag to set.

3. **`PRODUCTION (WEEK)` has inconsistent formatting.** Observed variants:
   `37`, `37 + 38`, `47 - 48`, `40 + 41+ 42 + 43`, `44 +45 +46 + 47`,
   `52 + 53 + 1 + 2`. The tokeniser extracts integer runs and ignores separators
   and whitespace entirely.

4. **`MOLD DESIGNATION` is a VLOOKUP formula** into sheet `List2`. If the cached
   value is absent, SheetJS returns blank. The parser falls back to resolving the
   `List2` item→mould mapping itself.

---

## 4. Completed quantity

The Excel has **no completed-quantity field**, so progress cannot be computed
today. The Warren Street dashboard footer states
*"Production flag = completed element"*, which identifies the mechanism that
exists in Polycon's workflow but is absent from this file.

Accordingly:

- Progress tiles render `— / 245` with the note *"Completed quantity will be
  calculated from the production status information in the updated Excel."*
- `parseWorkbook` sniffs for a production-flag column (`PRODUCED`, `DONE`,
  `COMPLETED`, `STATUS`) and for a filled-cell convention.
- When a flag is present, every progress surface computes from it with no other
  code change. When absent, those surfaces degrade to the placeholder.

No invented completion percentages appear anywhere in the product.

---

## 5. Risk engine

Mould-date risk is **all green** on Hirslandenklinik — the tightest buffer is
NHK3 at 10 days, and NHK4-7 are already ready to spray. A risk panel built on
mould dates alone would render empty.

The engine is therefore **capacity-based**, derived by crossing
`MOLD DESIGNATION` with `PRODUCTION (WEEK)` against the form-day capacity.

### 5.1 Capacity is measured in form-days

The stated limit is 3 forms *simultaneously per day*. Comparing distinct moulds
per week against 3 is wrong: four moulds in a week is not a breach if they run
on different days.

A week therefore offers `3 forms x 5 working days = 15 form-days`, and a mould
scheduled in a week consumes its production duration, `2 form-days`:

```
demand      = moulds x 2 form-days
capacity    = 15 form-days
utilisation = demand / capacity
```

Flagged when utilisation is at or above **0.75** (no headroom, *limited
buffer*), and escalated when it exceeds **1.0** (over capacity, *critical*).

### 5.2 What this yields on the real data

| Week | Pcs | Moulds | Form-days | Utilisation |
| ---: | ---: | ---: | ---: | ---: |
| 35 | 18.5 | 4 | 8 | 53% |
| 36 | 23.0 | 4 | 8 | 53% |
| **37** | 21.2 | **6** | **12** | **80%** |
| 38 | 19.7 | 4 | 8 | 53% |
| 39 | 21.7 | 4 | 8 | 53% |
| 40 | 18.8 | 4 | 8 | 53% |
| 41 | 17.2 | 4 | 8 | 53% |
| 42 | 16.2 | 5 | 10 | 67% |
| **43** | 20.8 | **6** | **12** | **80%** |
| 44+ | 3-8 | 1-2 | 2-4 | 13-27% |

Findings surfaced:

- **No capacity headroom** — weeks 37 and 43 at 80% utilisation. No week breaches
  capacity outright on this dataset, and the product does not claim otherwise.
- **Load imbalance** — 16-23 pcs/week through week 43, collapsing to 3-8
  pcs/week thereafter.
- **Mould readiness** — all 10 within window; tightest NHK3 at 10 days buffer.
  Reported as a single reassurance line rather than as silence, because an empty
  panel reads as broken rather than as good news.

Beethovenstrasse surfaces its 6 late forms and 3 tight ones directly from the
encoded status.

Quantities are spread evenly across the weeks a row lists. This is an
approximation and is labelled as such wherever it appears.

## 6. Architecture

Vite + React 19 + TypeScript (strict) + Tailwind v4 (`@tailwindcss/vite`).
SheetJS for parsing, Vitest for the logic layer, hand-rolled SVG for the Gantt
and donut.

```
src/
├─ config/
│   ├─ process.ts        capacity, durations, risk thresholds, flag headers
│   ├─ theme.ts          Warren Street design tokens
│   └─ copy.ts           wording carrying a commercial commitment
├─ types/domain.ts       Row · Mould · CallOff · Project · Risk · WeekRef
├─ data/
│   ├─ hirslanden.seed.ts        107 rows, verbatim
│   ├─ beethovenstrasse.ts       13 forms, no element rows
│   └─ projects.ts               registry + reference date
├─ lib/                  pure functions, no React, unit-tested
│   ├─ weeks.ts          tokenise · inferred year-wrap · ordering · week→date
│   ├─ parseWorkbook.ts  SheetJS → Row[] with List2 fallback + flag sniffing
│   ├─ derive.ts         KPIs · mould rollup · weekly load · call-off rollup
│   ├─ risk.ts           capacity · load balance · buffer ranking
│   └─ format.ts         working days, pluralisation, availability labels
├─ hooks/useProjectAnalysis.ts   memoised bridge from lib/ to views
├─ components/           KpiCard · Donut · GanttChart · StatusPill ·
│                        AttentionPanel · MouldDrawer · CapacityChart ·
│                        NoElementData
└─ views/                Portfolio · Intake · Overview · ProductionPlan ·
                         MouldReadiness · ProjectDetails · ExportReport
```

SheetJS is loaded via dynamic `import()` inside `parseWorkbook`, so the 429 kB
parser stays out of the initial bundle and only loads when a file is imported.
Excel serial-date conversion is implemented locally for the same reason.

**The `lib/` boundary is the central design decision.** Every number a client
will question resolves to a pure function with a test beside it. No derivation
happens inside a component.

No magic numbers in markup — all thresholds, capacities, and labels come from
`config/`.

---

## 7. Views

**Portfolio** — landing. Two real projects: Hirslandenklinik (parsed) and
Beethovenstrasse (encoded). Totals and at-risk count.

**Intake** — Upload (drag/drop `.xlsx`) → Processing. Seed data means the demo
works before any file is dropped; dropping the real file recomputes everything.

**Overview (L1)** — the five questions from the brief: progress, elements, next
production week, project status, risks. Mould readiness donut, weekly load bars,
Attention Required inline.

**Production Plan (L2)** — Gantt of items across weeks, filterable by call-off
and priority, coloured by mould.

**Mould Readiness (L3)** — table of form / products / pcs / ready state / buffer
/ status. Row click opens a drawer with production window, risk, and the item
list using that mould.

**Project Details (L4/L5)** — full schedule table plus raw parsed rows,
searchable and sortable.

**Export** — section checkboxes → print stylesheet → `window.print()`.

---

## 8. Visual language

**Data-Dense Dashboard** — a business-intelligence system, not a marketing one.
Tight padding, a strict grid, low-chrome surfaces, and colour reserved almost
entirely for data.

### 8.1 Tokens

| Role | Value | Notes |
| --- | --- | --- |
| Primary | `#1E40AF` | Series colour, active nav, focus rings |
| Accent | `#D97706` | Reserved for the one thing needing attention |
| Shell | `#132033` | Application chrome — top bar, drawer header |
| Canvas | `#EFF2F6` | Sits below surfaces so cards separate without shadow |
| Ink / muted / faint | `#0F172A` / `#4A5A70` / `#5B6A80` | 17.9:1, 7.0:1, 5.2:1 on white |
| Typeface | Fira Sans + Fira Code | Every figure is monospaced for column alignment |

### 8.2 Status colours are split by role

Fills and text are different values, because a graphical object needs 3:1 while
small text needs 4.5:1, and the saturated hues only reach 2.9-4.5:1 against
their own washes:

| Level | Fill (dot, bar) | Text (label) | Wash | Text ratio |
| --- | --- | --- | --- | ---: |
| On schedule | `#15803D` | `#166534` | `#E8F5EC` | 6.35 |
| Limited buffer | `#D97706` | `#92400E` | `#FDF3E3` | 6.45 |
| Action required | `#DC2626` | `#B91C1C` | `#FCEBEB` | 5.61 |

Status is never carried by colour alone — every instance pairs a coloured shape,
a glyph (check or alert) and a word.

### 8.3 Structure

- **Top bar** — brand, breadcrumb, data currency, import. The breadcrumb is
  required: the hierarchy is four levels deep.
- **Left rail** — report pages in hierarchy order, tagged L1-L4, with the
  project status pinned beneath. Persistent, so moving between levels never
  costs orientation. Collapses below `md`.
- **Canvas** — a grid of `Visual` containers. Every chart, table and panel uses
  the same container, which is what makes the canvas read as one report.
- **Slicers** — filters sit above the canvas, not inside a visual.

Reading order on every page is top-left to bottom-right: what and how much, then
when, then is the tooling ready, then what to do about it.

### 8.4 Charts

Hand-rolled SVG and CSS, no charting dependency. Bullet charts for KPI-vs-scale
comparisons (they tile; gauges do not), a two-segment donut for readiness, a
column chart with rounded axis ticks and low-contrast gridlines for weekly load,
and a week-grid Gantt with a heavier rule at the year boundary.

Chart accessibility: every value is printed as text beside its mark, marks carry
`title` tooltips and `aria-label`, and the timeline's mould identity is carried
by the row label as well as by colour.

### 8.5 Motion and preferences

150ms transitions on a single global easing token; `prefers-reduced-motion` is
respected globally. Focus rings are never removed.

## 9. Testing

Vitest over `lib/`:

- `weeks.ts` — all six observed week formats; year-wrap ordering; week→date
- `parseWorkbook.ts` — uncached VLOOKUP fallback; `READY TO SPRAY` union;
  flag-column sniffing present and absent
- `derive.ts` — totals reproduce 245 / 88 / 10 / 4 and the per-mould table in §2.1
- `risk.ts` — weeks 37 and 43 flagged; no false positives on mould dates

The §2.1 table is the regression fixture. If a refactor changes those numbers,
the tests fail.

**134 tests pass** across `weeks`, `parseWorkbook`, `derive` and `risk`.

---

## 10. Out of scope

- Live synchronisation with Excel — the file is not an API
- Authentication, persistence, backend of any kind
- Real PDF generation beyond print-to-PDF
- Invented sibling projects in the portfolio
