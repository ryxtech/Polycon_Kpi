Yes — **this is exactly where we should slow down and design the demo properly before coding more.** The client has essentially given you freedom to recommend a better presentation, and that is an opportunity for RYX.

I went through the actual Excel structure plus the two production-schedule PDFs and the reference dashboard. There is enough information here to build something **much stronger than simply copying their existing Excel/PDF into a dashboard**.

## 1. First, understand what Polycon actually has

Their current information is spread across two different kinds of production planning.

### A. Product / element production

The Beethovenstrasse production schedule shows:

* Product/element codes such as `BES1`, `BES2`, `BES3`, etc.
* Quantity of each product
* Priority 1, 2, 3, 4, 5
* Production weeks
* Required delivery dates
* Individual production occurrences across the calendar

For example, the schedule shows entries such as BES6 — 10 pcs, BES9 — 7 pcs, BES10 — 10 pcs, etc., organised by priority. 

### B. Mould/form production

The second PDF is even more interesting.

It contains:

* Form/mould name
* Priority
* Number of products using that form
* Total pieces
* Material preparation
* Form production
* Production capacity
* Inspection buffer
* Whether the form will be ready on time

And they explicitly state:

> production capacity: **3 forms simultaneously / day**

The schedule also has states such as:

* On schedule
* Limited buffer for inspection
* Form will not be ready on time — action required



**This is extremely valuable for the dashboard.**

Because now we can make the dashboard answer not only:

> "How much have we produced?"

but also:

> **"Are we going to be able to produce everything on time?"**

That's much more useful to a customer.

---

# 2. The actual Excel is simpler than the PDFs

The current Hirslandenklinik Excel has essentially these fields:

| Field             | Meaning                        |
| ----------------- | ------------------------------ |
| ITEM              | Product/element                |
| QTY               | Required quantity              |
| CALL OFF          | Production/call-off grouping   |
| MOLD DESIGNATION  | Which mould/form is associated |
| MOLD WILL BE DONE | When mould is ready            |
| PRODUCTION (WEEK) | Planned production week(s)     |

The supplied file contains **245 pieces across 88 unique items**, with 10 mould designations and 4 call-offs.

So our application should **not force Polycon to enter more information**.

Instead:

> **Excel remains the source.**

Our application becomes the intelligence + presentation layer.

---

# 3. I agree with you: make it feel like Power BI

But I wouldn't literally try to clone Power BI.

I'd make it feel like a **premium industrial project-control dashboard**.

Think:

**Power BI + modern SaaS dashboard + construction/manufacturing project reporting.**

The first screen should feel like:

> **"I opened this and understood the entire project in 10 seconds."**

That's the goal.

---

# 4. The first screen should NOT be the huge detailed schedule

This is the biggest design decision I'd recommend.

Their current documents are information-heavy.

The customer doesn't necessarily need to understand:

> BES3 → Priority 2 → 3 pcs → T14 → T15 → T16...

within the first 5 seconds.

Instead, the first screen should answer **five questions**.

### ① Where are we?

**PROJECT PROGRESS**

> **72%**

### ② How much is done?

**ELEMENTS**

> **176 / 245**

### ③ What is coming next?

**NEXT PRODUCTION**

> **Week 37**

### ④ Are we on schedule?

**PROJECT STATUS**

> 🟢 **ON TRACK**

### ⑤ Is anything at risk?

**PRODUCTION RISKS**

> 🟠 **3 items require attention**

That is what a customer understands immediately.

---

# 5. My proposed first screen

Something like this:

```text
┌─────────────────────────────────────────────────────────────┐
│ HIRSLANDENKLINIK                         Updated 11 Aug 2026 │
│ Production & Project Overview                    ● LIVE DATA │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  OVERALL PROGRESS      ELEMENTS          MOULDS             │
│       72%             176 / 245           8 / 10            │
│  ████████████░░       ███████░░░       ████████░░          │
│                                                             │
│  PROJECT STATUS        NEXT PRODUCTION   DELIVERY OUTLOOK   │
│  ● ON TRACK            Week 37           ● ON TRACK         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│              PRODUCTION PROGRESS                            │
│                                                             │
│  Planned     █████████████████████████                     │
│  Completed   ███████████████████                           │
│  Remaining   ██████                                        │
│                                                             │
├───────────────────────────┬─────────────────────────────────┤
│ MOULD READINESS            │ PRODUCTION SCHEDULE             │
│                            │                                 │
│  ● Ready       8           │ Week 37   ███████               │
│  ● In progress 1           │ Week 38   █████████             │
│  ● Pending      1          │ Week 39   ██████                │
│                            │ Week 40   ██████████             │
├───────────────────────────┴─────────────────────────────────┤
│                                                             │
│ ⚠ ATTENTION REQUIRED                                       │
│                                                             │
│ 3 moulds have limited production buffer                     │
│ 1 production stage may affect planned delivery              │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**That is the direction I'd take.**

---

# 6. Then give them a "Production Plan" page

This is where we take the information from their existing Beethovenstrasse schedule and make it dramatically easier to understand.

Their current schedule has a huge calendar with many rows and colours. 

Instead, we can make:

### Production Timeline

```text
                 AUGUST                    SEPTEMBER

              11   18   25   01   08   15   22

BES1          ███████
BES2               █████████
BES3                    ███████████
BES6                         ███████
BES7                              █████████
BES9                   █████████
BES10                         ███████████
```

Then add:

**Priority**

🟥 Critical
🟠 High
🟢 Normal

And allow:

> **Priority 1–5**

to be filtered.

---

# 7. But the really powerful page is "Mould Readiness"

This is where you can differentiate your demo.

Their current mould schedule already tells us that mould readiness affects production. It even identifies cases where the form won't be ready on time. 

So make a page like:

## MOULD READINESS

```text
FORM       PRODUCTS     REQUIRED PCS     STATUS

NHK1          6              7            🟢 READY
NHK2         11             15            🟢 READY
NHK3          6             16            🟠 LIMITED BUFFER
NHK4         14             47            🟢 READY
NHK5          9             11            🟢 READY
NHK6         21             40            🟢 READY
NHK7         37            104            🟠 LIMITED BUFFER
NHK8          1              1            🟢 READY
NHK9          1              1            🟢 READY
NHK10         1              3            🟢 READY
```

Then clicking **NHK7** opens:

```text
NHK7

104 pieces
37 product items

Production demand
████████████████████

Mould readiness
████████████████░░░

Production window
Week 37 → Week 48

Risk
🟠 Limited buffer

Products using this mould
FP30
FP31
FP32
FP33
...
```

That's a **real management tool**, not just a report.

---

# 8. Add an "Attention Required" section

This is something I strongly recommend.

Don't make the customer search the dashboard for problems.

Tell them.

### ATTENTION REQUIRED

**🟠 Limited buffer**

> NHK7 — production buffer approaching required delivery period.

**🔴 Potential delay**

> Form BES8 — currently projected beyond required readiness.

**🟢 On schedule**

> 8 moulds currently within planned production window.

This directly uses the logic already present in their existing form schedule. 

---

# 9. "Live load" feeling is a very good idea

But one clarification:

The Excel isn't actually a live API.

So don't call it **LIVE PRODUCTION DATA** unless the system is actually synchronising continuously.

Instead use something like:

> **● DATA CURRENT AS OF 11 AUG 2026**

or

> **Updated 11 Aug 2026 · Excel imported 14:32**

Then visually make it feel live:

```text
● DATA UPDATED
11 Aug 2026 · 14:32

Next refresh:
When latest Excel is uploaded
```

Later, if Polycon wants automatic synchronisation, you can genuinely make it live.

---

# 10. And I would add an Excel upload screen

This makes the whole product understandable.

### Step 1

```text
UPLOAD PRODUCTION DATA

┌─────────────────────────────────────┐
│                                     │
│       Drop Excel file here          │
│                                     │
│       or Browse files               │
│                                     │
└─────────────────────────────────────┘

✓ Excel structure detected
✓ 245 production quantities
✓ 88 product types
✓ 10 moulds
✓ 4 call-offs

              GENERATE REPORT →
```

Then show:

### Processing

```text
Reading Excel                         ✓
Identifying projects                  ✓
Processing mould data                 ✓
Processing production schedule        ✓
Calculating production status         ✓
Checking schedule risks               ✓
Generating dashboard                  ✓

              REPORT READY
```

That will give the demo a **very strong "product" feeling**.

---

# 11. Then PDF generation

After the dashboard:

**Export Customer Report**

Options:

```text
☑ Executive Overview
☑ Production Progress
☑ Mould Readiness
☑ Production Schedule
☑ Attention / Risks

[ Generate PDF ]
```

And the PDF should look like a polished client report—not like an exported Excel sheet.

---

# 12. Multiple projects should be a separate management view

Marek explicitly asked for individual projects **and multiple selected projects combined**.

So eventually:

### PROJECT PORTFOLIO

```text
ACTIVE PROJECTS                         STATUS

Hirslandenklinik       72%             🟢
Beethovenstrasse       84%             🟢
Project C              61%             🟠
Project D              39%             🔴

────────────────────────────────────────────

TOTAL PROJECTS             4
TOTAL ELEMENTS           1,248
COMPLETED                  892
REMAINING                  356

PROJECTS AT RISK             1
```

Then clicking Hirslandenklinik takes you into the detailed project dashboard.

---

# 13. One VERY important issue we need to handle

This is where I don't want you to accidentally promise something the Excel can't currently support.

The Excel gives us:

**QTY**

but it does **not appear to contain a direct "completed quantity" field**.

Marek explained the intended logic:

> If 13 are required and 5 are already produced → 8 remain.

Therefore we need to establish **where that "5 produced" information comes from** in their continually updated Excel.

Until we know that, we should **not put fake "72% completed" numbers in the demo**.

Instead, we can make the UI ready for it:

> **Production Progress**
> `— / 245`

and explain:

> "Completed quantity will be calculated from the production status information in the updated Excel."

Once Marek confirms where that information exists, we wire it in.

---

# 14. The most important dashboard hierarchy

I'd build the whole product around this hierarchy:

### LEVEL 1 — Executive glance

**Status → Progress → Quantity → Delivery → Risk**

### LEVEL 2 — Production

**What is being produced → When → How much → Priority**

### LEVEL 3 — Moulds

**Which mould → How many products → Ready when → Capacity → Risk**

### LEVEL 4 — Detailed schedule

**Individual products → production days/weeks → delivery dates**

### LEVEL 5 — Raw data

**Excel-derived table**

This way, a customer who has **zero knowledge of the Excel** can understand the project.

A production manager can drill deeper.

And Polycon can still get all the detailed information they already have.

---

## And this is the key positioning for RYX

Don't tell Marek:

> "We can convert your Excel into a dashboard."

That's technically correct but commercially weak.

The better concept is:

> **"We transform the existing production planning data into a customer-facing project intelligence dashboard, while keeping Excel as the operational source."**

That is much more valuable.

And I think we should **design the complete screen structure first**—probably around **4 main views: Overview, Production Plan, Mould Readiness, and Project Details**—before we write more code.

The next thing I'd do is go through the **actual Excel columns + both PDFs together and define exactly what every KPI, chart, warning, timeline and calculation should mean**, including what we can calculate now and what needs clarification from Marek. That will give you a solid blueprint for the impressive Power BI-style demo.
