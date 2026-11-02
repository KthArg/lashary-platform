export function requestedPage(value: string | string[] | undefined): number {
  const raw = Array.isArray(value) ? value[0] : value
  return raw !== undefined && /^[1-9]\d{0,5}$/.test(raw) ? Number(raw) : 1
}
