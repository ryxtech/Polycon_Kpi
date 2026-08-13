import { normaliseRows } from '@/lib/parseWorkbook'
import type { Project } from '@/types/domain'
import {
  BEETHOVENSTRASSE_DATA_AS_OF,
  BEETHOVENSTRASSE_FORMS,
} from './beethovenstrasse'
import {
  HIRSLANDEN_BASE_YEAR,
  HIRSLANDEN_DATA_AS_OF,
  HIRSLANDEN_RAW_ROWS,
} from './hirslanden.seed'
import {
  SPECIMEN_BASE_YEAR,
  SPECIMEN_DATA_AS_OF,
  SPECIMEN_RAW_ROWS,
} from './specimen'

/**
 * Reference date for buffer calculations.
 *
 * Fixed to the date of the Hirslandenklinik overview rather than "now", so the
 * figures a client sees match the document they were derived from and do not
 * drift as the demo ages.
 */
export const REFERENCE_DATE = new Date(Date.UTC(2026, 7, 11))

export const HIRSLANDENKLINIK: Project = {
  id: 'hirslandenklinik',
  name: 'Hirslandenklinik',
  client: 'GFT Fassaden',
  source: 'Hirslandenklinik - OVERVIEW - 11.8.2026.xlsx',
  dataAsOf: HIRSLANDEN_DATA_AS_OF,
  rows: normaliseRows(HIRSLANDEN_RAW_ROWS, HIRSLANDEN_BASE_YEAR),
}

export const BEETHOVENSTRASSE: Project = {
  id: 'beethovenstrasse',
  name: 'Beethovenstrasse',
  client: 'GFT Fassaden',
  source: 'Beethovenstrasse form production schedule (PDF)',
  dataAsOf: BEETHOVENSTRASSE_DATA_AS_OF,
  rows: [],
  encodedMoulds: BEETHOVENSTRASSE_FORMS,
}

/**
 * The complete-data specimen.
 *
 * Same columns and same shape as the real workbook, plus the produced quantity
 * and priority it lacks — so the client can see what the identical dashboard
 * does once those two columns exist, instead of having it described.
 */
export const SPECIMEN: Project = {
  id: 'specimen',
  name: 'Sample project — complete data',
  client: 'Specimen',
  source: 'Constructed from the Hirslandenklinik column structure',
  dataAsOf: SPECIMEN_DATA_AS_OF,
  rows: normaliseRows(SPECIMEN_RAW_ROWS, SPECIMEN_BASE_YEAR),
  specimen: true,
  specimenNote:
    'Not a real job. Shows what this dashboard reports once the spreadsheet carries a produced quantity and a priority.',
}

export const PROJECTS: Project[] = [
  HIRSLANDENKLINIK,
  BEETHOVENSTRASSE,
  SPECIMEN,
]

export function findProject(id: string): Project | undefined {
  return PROJECTS.find((project) => project.id === id)
}
