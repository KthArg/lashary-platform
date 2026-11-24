import { describe, it, expect, vi } from 'vitest'
import { ok, err } from '@/shared/result'
import { exportLedger } from '../export-ledger'
import { CSV_BOM, CSV_HEADER, CSV_SEPARATOR } from '../../domain/ledger-csv'
import { LEDGER_RANGE_MESSAGES } from '../../domain/ledger-export-range'
import { invalidLedgerRange, ledgerExportTooLarge, paymentsStorageFailed } from '../../domain/errors'
import type { LedgerExportRepository } from '../ports'

const repoReturning = (result: Awaited<ReturnType<LedgerExportRepository['entriesIn']>>) => ({
  entriesIn: vi.fn(async () => result),
})

describe('exportLedger', () => {
  it('arma el CSV y el nombre del archivo con las fechas del rango', async () => {
    const repo = repoReturning(
      ok([
        {
          createdAt: new Date('2026-11-10T16:00:00Z'),
          clientName: 'Ana Mora',
          appointmentId: null,
          kind: 'payment',
          amount: -5000,
        },
      ]),
    )

    const result = await exportLedger({ repo })({ fromDate: '2026-11-01', toDate: '2026-11-30' })

    expect(result.ok && result.value.filename).toBe('ledger-2026-11-01-a-2026-11-30.csv')
    expect(result.ok && result.value.csv.startsWith(CSV_BOM + CSV_HEADER.join(CSV_SEPARATOR))).toBe(true)
    expect(result.ok && result.value.csv).toContain('Ana Mora;;Pago;-5000')
    expect(repo.entriesIn).toHaveBeenCalledWith(expect.objectContaining({ fromDate: '2026-11-01', toDate: '2026-11-30' }))
  })

  it('rechaza un rango inválido sin leer el ledger', async () => {
    const repo = repoReturning(ok([]))

    const result = await exportLedger({ repo })({ fromDate: '2026-11-30', toDate: '2026-11-01' })

    expect(!result.ok && result.error).toEqual(invalidLedgerRange(LEDGER_RANGE_MESSAGES.order))
    expect(repo.entriesIn).not.toHaveBeenCalled()
  })

  it.each([ledgerExportTooLarge(20000), paymentsStorageFailed('caída')])(
    'devuelve el error de la lectura tal cual: %o',
    async (failure) => {
      const result = await exportLedger({ repo: repoReturning(err(failure)) })({
        fromDate: '2026-11-01',
        toDate: '2026-11-30',
      })

      expect(!result.ok && result.error).toEqual(failure)
    },
  )
})
