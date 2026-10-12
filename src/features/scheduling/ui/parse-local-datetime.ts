const COSTA_RICA_UTC_OFFSET = '-06:00'

export function parseCostaRicaLocalDateTime(value: string): Date {
  const withSeconds = value.length === 16 ? `${value}:00` : value
  return new Date(`${withSeconds}${COSTA_RICA_UTC_OFFSET}`)
}
