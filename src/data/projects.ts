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

export const PROJECTS: Project[] = [HIRSLANDENKLINIK, BEETHOVENSTRASSE]

export function findProject(id: string): Project | undefined {
  return PROJECTS.find((project) => project.id === id)
}
