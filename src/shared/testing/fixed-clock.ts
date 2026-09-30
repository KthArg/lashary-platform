import type { Clock } from '../clock'

export const fixedDate = (iso: string): Date => new Date(iso)

export const fixedClock = (iso: string): Clock => {
  const at = fixedDate(iso)
  return () => at
}
