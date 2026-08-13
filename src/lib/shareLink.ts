/**
 * Client share links.
 *
 * Polycon's alternative today is to export a PDF and email it, which is a
 * snapshot: the moment the spreadsheet is updated the customer holds a stale
 * document and someone has to remember to send another. A link does not go
 * stale — the customer opens the same address and sees whatever was last
 * imported.
 *
 * Links are `/shared/<token>` where the token is random and unguessable. The
 * project id is deliberately *not* in the URL: `/shared/hirslandenklinik` would
 * invite anyone to try `/shared/beethovenstrasse` and reach a project that was
 * never shared with them.
 *
 * Nothing about the schedule travels in the URL either, so a link cannot be
 * edited to display figures that were never published.
 */

/** Path prefix identifying a customer link. */
export const SHARE_PATH = '/shared/'

const STORAGE_KEY = 'polycon.share-tokens'

/** token → project id */
type ShareMap = Record<string, string>

function readTokens(): ShareMap {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        ([, value]) => typeof value === 'string',
      ),
    ) as ShareMap
  } catch {
    // A corrupt or blocked store must not take the app down with it.
    return {}
  }
}

function writeTokens(tokens: ShareMap): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tokens))
  } catch {
    // Private browsing refuses writes; sharing simply will not persist.
  }
}

/**
 * A 32-character URL-safe token from the platform CSPRNG.
 *
 * `Math.random` would be wrong here — it is seeded predictably enough that a
 * determined guesser could enumerate links.
 */
export function generateToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

/** The live token for a project, or null when it is not shared. */
export function tokenFor(projectId: string): string | null {
  const entry = Object.entries(readTokens()).find(([, id]) => id === projectId)
  return entry ? entry[0] : null
}

export function isShared(projectId: string): boolean {
  return tokenFor(projectId) !== null
}

/** Starts sharing, reusing the existing token so a sent link keeps working. */
export function startSharing(projectId: string): string {
  const existing = tokenFor(projectId)
  if (existing) return existing

  const token = generateToken()
  writeTokens({ ...readTokens(), [token]: projectId })
  return token
}

/** Withdraws the link. Anyone still holding it now reaches a dead end. */
export function stopSharing(projectId: string): void {
  const tokens = readTokens()
  for (const [token, id] of Object.entries(tokens)) {
    if (id === projectId) delete tokens[token]
  }
  writeTokens(tokens)
}

/** The project a token points at, or null once it has been withdrawn. */
export function resolveShareToken(token: string): string | null {
  return readTokens()[token] ?? null
}

/** Builds the link Polycon sends. Absolute, so it survives being pasted. */
export function buildShareLink(token: string, origin: string): string {
  const url = new URL(origin)
  url.search = ''
  url.hash = ''
  url.pathname = `${SHARE_PATH}${token}`
  return url.toString()
}

/** The token in a path, or null when this is the internal view. */
export function readTokenFromPath(pathname: string): string | null {
  if (!pathname.startsWith(SHARE_PATH)) return null
  const token = pathname.slice(SHARE_PATH.length).split('/')[0]
  return token && token.trim() !== '' ? token.trim() : null
}

/**
 * Pages a shared link may reach.
 *
 * An allow-list rather than a deny-list: a page added later is internal until
 * someone decides otherwise, which is the safe direction for an oversight to
 * fall. Raw data and the import screen are Polycon's own working surfaces.
 */
export const CLIENT_VISIBLE_PAGES = [
  'overview',
  'plan',
  'moulds',
  'schedule',
  'export',
] as const

export type ClientVisiblePage = (typeof CLIENT_VISIBLE_PAGES)[number]

export function isClientVisible(page: string): page is ClientVisiblePage {
  return (CLIENT_VISIBLE_PAGES as readonly string[]).includes(page)
}
