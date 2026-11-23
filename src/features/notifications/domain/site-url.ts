const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

export function buildSiteUrl(siteUrl: string | undefined, path: string): string | null {
  if (!siteUrl) return null
  try {
    const url = new URL(path, siteUrl)
    return ALLOWED_PROTOCOLS.has(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}
