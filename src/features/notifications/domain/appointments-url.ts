const ALLOWED_PROTOCOLS = new Set(['http:', 'https:'])

export function buildAppointmentsUrl(siteUrl: string | undefined, appointmentsPath: string): string | null {
  if (!siteUrl) return null
  try {
    const url = new URL(appointmentsPath, siteUrl)
    return ALLOWED_PROTOCOLS.has(url.protocol) ? url.toString() : null
  } catch {
    return null
  }
}
