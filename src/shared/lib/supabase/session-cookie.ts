const CHUNK_SUFFIX = /^\.\d+$/

export function supabaseSessionCookieName(supabaseUrl: string): string {
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  return `sb-${projectRef}-auth-token`
}

function cookieNamesIn(cookieHeader: string): string[] {
  return cookieHeader
    .split(';')
    .map((cookie) => cookie.split('=')[0].trim())
    .filter((name) => name.length > 0)
}

function isSessionCookie(name: string, sessionCookieName: string): boolean {
  if (name === sessionCookieName) return true
  return name.startsWith(sessionCookieName) && CHUNK_SUFFIX.test(name.slice(sessionCookieName.length))
}

export function hasSupabaseSessionCookie(cookieHeader: string, supabaseUrl: string): boolean {
  if (!URL.canParse(supabaseUrl)) return false
  const sessionCookieName = supabaseSessionCookieName(supabaseUrl)
  return cookieNamesIn(cookieHeader).some((name) => isSessionCookie(name, sessionCookieName))
}
