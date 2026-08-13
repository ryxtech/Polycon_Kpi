import { beforeEach, describe, expect, it } from 'vitest'
import {
  CLIENT_VISIBLE_PAGES,
  SHARE_PATH,
  buildShareLink,
  generateToken,
  isClientVisible,
  isShared,
  readTokenFromPath,
  resolveShareToken,
  startSharing,
  stopSharing,
  tokenFor,
} from './shareLink'

beforeEach(() => window.localStorage.clear())

describe('tokens', () => {
  it('are long and URL-safe', () => {
    const token = generateToken()
    expect(token).toHaveLength(32)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('do not repeat', () => {
    const tokens = new Set(Array.from({ length: 200 }, generateToken))
    expect(tokens.size).toBe(200)
  })

  it('never contain the project id', () => {
    // /shared/hirslandenklinik would invite guessing /shared/beethovenstrasse
    // and reaching a project that was never shared.
    const token = startSharing('hirslandenklinik')
    expect(token).not.toContain('hirslanden')
  })
})

describe('sharing lifecycle', () => {
  it('is off until a link is created', () => {
    expect(isShared('hirslandenklinik')).toBe(false)
    expect(tokenFor('hirslandenklinik')).toBeNull()
  })

  it('resolves a live token back to its project', () => {
    const token = startSharing('hirslandenklinik')
    expect(resolveShareToken(token)).toBe('hirslandenklinik')
    expect(isShared('hirslandenklinik')).toBe(true)
  })

  it('reuses the token so an already-sent link keeps working', () => {
    // Re-opening the dialog must not silently invalidate the link the customer
    // already has.
    const first = startSharing('hirslandenklinik')
    const second = startSharing('hirslandenklinik')
    expect(second).toBe(first)
  })

  it('kills the token when sharing stops', () => {
    const token = startSharing('hirslandenklinik')
    stopSharing('hirslandenklinik')

    expect(resolveShareToken(token)).toBeNull()
    expect(isShared('hirslandenklinik')).toBe(false)
  })

  it('keeps projects independent', () => {
    // Withdrawing one customer's link must not withdraw another's.
    const a = startSharing('hirslandenklinik')
    const b = startSharing('beethovenstrasse')
    stopSharing('hirslandenklinik')

    expect(resolveShareToken(a)).toBeNull()
    expect(resolveShareToken(b)).toBe('beethovenstrasse')
  })

  it('rejects a token that was never issued', () => {
    expect(resolveShareToken('made-up-token')).toBeNull()
  })

  it('survives a corrupt store rather than throwing', () => {
    window.localStorage.setItem('polycon.share-tokens', 'not json')
    expect(isShared('hirslandenklinik')).toBe(false)
  })
})

describe('buildShareLink', () => {
  it('produces a path-based absolute link', () => {
    expect(buildShareLink('abc123', 'https://reports.polycon.cz/')).toBe(
      'https://reports.polycon.cz/shared/abc123',
    )
  })

  it('discards any query, fragment or path already on the page', () => {
    // A link built while a filter was applied would otherwise carry that filter
    // to the customer, showing a subset as if it were the whole.
    expect(buildShareLink('abc123', 'https://x.dev/internal?week=W37#raw')).toBe(
      'https://x.dev/shared/abc123',
    )
  })

  it('carries no schedule data', () => {
    const url = new URL(buildShareLink('abc123', 'https://x.dev/'))
    expect(url.searchParams.size).toBe(0)
    expect(url.pathname).toBe(`${SHARE_PATH}abc123`)
  })
})

describe('readTokenFromPath', () => {
  it('reads the token back out', () => {
    expect(readTokenFromPath('/shared/abc123')).toBe('abc123')
  })

  it('ignores anything after the token', () => {
    expect(readTokenFromPath('/shared/abc123/extra')).toBe('abc123')
  })

  it.each(['/', '/shared', '/shared/', '/other/abc123', ''])(
    'returns null for %o so the app falls back to the internal view',
    (path) => {
      expect(readTokenFromPath(path)).toBeNull()
    },
  )
})

describe('client-visible pages', () => {
  it('admits the four report pages and the report itself', () => {
    expect([...CLIENT_VISIBLE_PAGES]).toEqual([
      'overview',
      'plan',
      'moulds',
      'schedule',
      'export',
    ])
  })

  it.each(['raw', 'intake', 'portfolio'])('keeps %o out of a link', (page) => {
    expect(isClientVisible(page)).toBe(false)
  })

  it('treats an unknown page as internal', () => {
    expect(isClientVisible('some-future-page')).toBe(false)
  })
})
