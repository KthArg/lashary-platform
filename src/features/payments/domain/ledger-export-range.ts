import { ok, err, type Result } from '@/shared/result'
import { addCalendarDays, isCalendarDate, studioLocalToUtc } from '@/shared/studio-time'
import { invalidLedgerRange, type InvalidLedgerRange } from './errors'

export const LEDGER_EXPORT_MAX_DAYS = 366

export const LEDGER_EXPORT_QUERY = { from: 'desde', to: 'hasta' } as const

export const LEDGER_RANGE_MESSAGES = {
  missing: 'indique las fechas desde y hasta',
  format: 'las fechas deben ser reales y tener el formato AAAA-MM-DD',
  order: 'la fecha desde no puede ser posterior a la fecha hasta',
  tooLong: `el rango no puede pasar de ${LEDGER_EXPORT_MAX_DAYS} días`,
} as const

export interface LedgerRange {
  readonly fromDate: string
  readonly toDate: string
  readonly startsAt: Date
  readonly endsBefore: Date
}

export function buildLedgerRange(
  fromDate: string | null,
  toDate: string | null,
): Result<LedgerRange, InvalidLedgerRange> {
  if (!fromDate || !toDate) return err(invalidLedgerRange(LEDGER_RANGE_MESSAGES.missing))
  if (!isCalendarDate(fromDate) || !isCalendarDate(toDate)) {
    return err(invalidLedgerRange(LEDGER_RANGE_MESSAGES.format))
  }
  if (fromDate > toDate) return err(invalidLedgerRange(LEDGER_RANGE_MESSAGES.order))
  if (toDate > addCalendarDays(fromDate, LEDGER_EXPORT_MAX_DAYS - 1)) {
    return err(invalidLedgerRange(LEDGER_RANGE_MESSAGES.tooLong))
  }
  return ok({
    fromDate,
    toDate,
    startsAt: studioLocalToUtc(fromDate, 0),
    endsBefore: studioLocalToUtc(addCalendarDays(toDate, 1), 0),
  })
}
