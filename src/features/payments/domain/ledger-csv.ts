import { studioDateTimeInputValue } from '@/shared/studio-time'

export const LEDGER_KINDS = ['charge', 'deposit_credit', 'payment', 'forgiveness_credit'] as const
export type LedgerKind = (typeof LEDGER_KINDS)[number]

export interface LedgerExportEntry {
  readonly createdAt: Date
  readonly clientName: string
  readonly appointmentId: string | null
  readonly kind: LedgerKind
  readonly amount: number
}

export const CSV_BOM = '﻿'
export const CSV_LINE_BREAK = '\r\n'
export const CSV_HEADER = ['Fecha', 'Clienta', 'Cita', 'Tipo', 'Monto']

export const LEDGER_KIND_LABELS: Record<LedgerKind, string> = {
  charge: 'Cargo',
  deposit_credit: 'Anticipo',
  payment: 'Pago',
  forgiveness_credit: 'Condonación',
}

const FORMULA_START = /^[=+\-@\t\r]/
const NEEDS_QUOTES = /[",\r\n]/

export function csvTextCell(value: string): string {
  const neutralized = FORMULA_START.test(value) ? `'${value}` : value
  return NEEDS_QUOTES.test(neutralized) ? `"${neutralized.replaceAll('"', '""')}"` : neutralized
}

const studioTimestamp = (instant: Date): string => studioDateTimeInputValue(instant).replace('T', ' ')

export function buildLedgerCsv(entries: readonly LedgerExportEntry[]): string {
  const rows = entries.map((entry) =>
    [
      csvTextCell(studioTimestamp(entry.createdAt)),
      csvTextCell(entry.clientName),
      csvTextCell(entry.appointmentId ?? ''),
      csvTextCell(LEDGER_KIND_LABELS[entry.kind]),
      String(entry.amount),
    ].join(','),
  )
  return CSV_BOM + [CSV_HEADER.join(','), ...rows].join(CSV_LINE_BREAK) + CSV_LINE_BREAK
}
