import { describe, it, expect } from 'vitest'
import { isInvalidLedgerRange } from '../errors'
import { buildLedgerRange, LEDGER_EXPORT_MAX_DAYS, LEDGER_RANGE_MESSAGES } from '../ledger-export-range'

describe('buildLedgerRange', () => {
  it('convierte las fechas del estudio a instantes UTC con el hasta inclusivo', () => {
    const range = buildLedgerRange('2026-11-01', '2026-11-30')

    expect(range.ok && range.value.startsAt.toISOString()).toBe('2026-11-01T06:00:00.000Z')
    expect(range.ok && range.value.endsBefore.toISOString()).toBe('2026-12-01T06:00:00.000Z')
  })

  it('acepta un solo día', () => {
    expect(buildLedgerRange('2026-11-10', '2026-11-10').ok).toBe(true)
  })

  it('acepta exactamente el máximo de días y rechaza uno más', () => {
    expect(buildLedgerRange('2026-01-01', '2027-01-01').ok).toBe(true)
    const tooLong = buildLedgerRange('2026-01-01', '2027-01-02')

    expect(!tooLong.ok && tooLong.error.message).toBe(LEDGER_RANGE_MESSAGES.tooLong)
    expect(LEDGER_EXPORT_MAX_DAYS).toBe(366)
  })

  it.each([
    [null, '2026-11-10', LEDGER_RANGE_MESSAGES.missing],
    ['2026-11-10', '', LEDGER_RANGE_MESSAGES.missing],
    ['10/11/2026', '2026-11-10', LEDGER_RANGE_MESSAGES.format],
    ['2026-02-30', '2026-03-01', LEDGER_RANGE_MESSAGES.format],
    ['2026-11-11', '2026-11-10', LEDGER_RANGE_MESSAGES.order],
  ])('rechaza %s a %s con su motivo', (fromDate, toDate, message) => {
    const range = buildLedgerRange(fromDate, toDate)

    expect(!range.ok && isInvalidLedgerRange(range.error)).toBe(true)
    expect(!range.ok && range.error.message).toBe(message)
  })
})
