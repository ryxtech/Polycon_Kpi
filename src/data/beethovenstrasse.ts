import type { EncodedMould } from '@/types/domain'

/**
 * Beethovenstrasse, transcribed from the two published schedules:
 *
 *   Beethovenstrasse_form_schedule_EN.pdf        (13 forms, statuses, delays)
 *   Beethovenstrasse_production_schedule_EN.pdf  (element rows by priority)
 *
 * Both are dated 07.07.2026 and share the customer GFT Fassaden.
 *
 * There is no workbook for this project, so the forms carry the status Polycon
 * themselves determined rather than one derived here. BES4 does not appear in
 * either document and is therefore absent.
 */
export const BEETHOVENSTRASSE_FORMS: EncodedMould[] = [
  {
    name: 'BES1',
    priority: 1,
    productCount: 5,
    totalQty: 6,
    status: 'on-schedule',
    lateByWorkingDays: null,
    products: ['#191', '#192', '#193', '#194', '#195'],
  },
  {
    name: 'BES2',
    priority: 1,
    productCount: 5,
    totalQty: 6,
    status: 'on-schedule',
    lateByWorkingDays: null,
    products: ['#161', '#162', '#163', '#164', '#165'],
  },
  {
    name: 'BES3',
    priority: 1,
    productCount: 14,
    totalQty: 52,
    status: 'limited-buffer',
    lateByWorkingDays: null,
    products: [
      '#100', '#101', '#102', '#104', '#105', '#106', '#108',
      '#109', '#110', '#111', '#154', '#155', '#156', '#157',
    ],
  },
  {
    name: 'BES5',
    priority: 1,
    productCount: 2,
    totalQty: 6,
    status: 'limited-buffer',
    lateByWorkingDays: null,
    products: ['#166', '#167'],
  },
  {
    name: 'BES6',
    priority: 1,
    productCount: 1,
    totalQty: 10,
    status: 'limited-buffer',
    lateByWorkingDays: null,
    products: ['#170'],
  },
  {
    name: 'BES8',
    priority: 1,
    productCount: 4,
    totalQty: 14,
    status: 'on-schedule',
    lateByWorkingDays: null,
    products: ['#171', '#172', '#175', '#190'],
  },
  {
    name: 'BES9',
    priority: 1,
    productCount: 1,
    totalQty: 38,
    status: 'critical',
    lateByWorkingDays: 1,
    products: ['#176'],
  },
  {
    name: 'BES10',
    priority: 1,
    productCount: 3,
    totalQty: 6,
    status: 'on-schedule',
    lateByWorkingDays: null,
    products: ['#182', '#183', '#184'],
  },
  {
    name: 'BES11',
    priority: 4,
    productCount: 2,
    totalQty: 23,
    status: 'critical',
    lateByWorkingDays: 1,
    products: ['#180', '#181'],
  },
  {
    name: 'BES7',
    priority: 5,
    productCount: 3,
    totalQty: 14,
    status: 'critical',
    lateByWorkingDays: 3,
    products: ['#173', '#174', '#177'],
  },
  {
    name: 'BES12',
    priority: null,
    productCount: 14,
    totalQty: 20,
    status: 'critical',
    lateByWorkingDays: 3,
    products: [
      '#122', '#123', '#124', '#125', '#128', '#129', '#130',
      '#131', '#132', '#133', '#134', '#135', '#136', '#137',
    ],
  },
  {
    name: 'BES13',
    priority: null,
    productCount: 5,
    totalQty: 16,
    status: 'critical',
    lateByWorkingDays: 3,
    products: ['#145', '#147', '#149', '#150', '#152'],
  },
  {
    name: 'BES14',
    priority: null,
    productCount: 7,
    totalQty: 23,
    status: 'critical',
    lateByWorkingDays: 5,
    products: ['#140', '#141', '#142', '#143', '#151', '#153', '#158'],
  },
]

export const BEETHOVENSTRASSE_DATA_AS_OF = '7 Jul 2026'

/**
 * There are deliberately no element-level rows for this project.
 *
 * The only element data available is the plotted Gantt in the production
 * schedule PDF. Reading quantities and weeks back off that image produced
 * totals that contradicted the form schedule's own figures, so the transcription
 * was dropped rather than shipped: a fabricated row is worse than an absent one.
 *
 * The form schedule above is published, authoritative, and enough to drive the
 * portfolio and mould readiness views. Element-level views show an empty state
 * until a workbook for this project exists.
 */
export const BEETHOVENSTRASSE_HAS_ELEMENT_ROWS = false
