import { describe, it, expect } from 'vitest'
import {
  buildLedgerCsv,
  CSV_BOM,
  CSV_HEADER,
  CSV_SEPARATOR,
  csvTextCell,
  LEDGER_KIND_LABELS,
  LEDGER_KINDS,
  type LedgerExportEntry,
} from '../ledger-csv'

const entry = (overrides: Partial<LedgerExportEntry> = {}): LedgerExportEntry => ({
  createdAt: new Date('2026-11-20T20:35:00Z'),
  clientName: 'Ana Solís',
  appointmentId: 'cita-1',
  kind: 'charge',
  amount: 25000,
  ...overrides,
})

describe('buildLedgerCsv', () => {
  it('empieza con el BOM y el encabezado en español separado por punto y coma, y termina con salto de línea', () => {
    const csv = buildLedgerCsv([])

    expect(csv).toBe(`${CSV_BOM}${CSV_HEADER.join(CSV_SEPARATOR)}\r\n`)
    expect(CSV_HEADER.join(CSV_SEPARATOR)).toBe('Fecha;Clienta;Cita;Tipo;Monto')
    expect(CSV_SEPARATOR).toBe(';')
  })

  it('escribe la fecha en hora del estudio y el monto como entero con signo', () => {
    const csv = buildLedgerCsv([entry(), entry({ kind: 'payment', amount: -10000 })])

    const rows = csv.trimEnd().split('\r\n').slice(1)
    expect(rows).toEqual([
      '2026-11-20 14:35;Ana Solís;cita-1;Cargo;25000',
      '2026-11-20 14:35;Ana Solís;cita-1;Pago;-10000',
    ])
  })

  it('traduce cada tipo de asiento y deja vacía la cita ausente', () => {
    const rows = LEDGER_KINDS.map((kind) => buildLedgerCsv([entry({ kind, appointmentId: null })]))

    LEDGER_KINDS.forEach((kind, index) => {
      expect(rows[index]).toContain(`;;${LEDGER_KIND_LABELS[kind]};`)
    })
    expect(Object.values(LEDGER_KIND_LABELS)).toEqual(['Cargo', 'Anticipo', 'Pago', 'Condonación'])
  })
})

describe('csvTextCell', () => {
  it('encierra entre comillas lo que lleva punto y coma, coma, comilla o salto de línea y duplica las comillas', () => {
    expect(csvTextCell('Solís; Ana')).toBe('"Solís; Ana"')
    expect(csvTextCell('Solís, Ana')).toBe('"Solís, Ana"')
    expect(csvTextCell('la "reina"')).toBe('"la ""reina"""')
    expect(csvTextCell('a\nb')).toBe('"a\nb"')
    expect(csvTextCell('Ana')).toBe('Ana')
  })

  it.each(['=SUMA(A1)', '+1', '-1', '@cmd', '\tx', '\rx'])('neutraliza la fórmula %j con un apóstrofo', (value) => {
    expect(csvTextCell(value).replace(/^"/, '').startsWith("'")).toBe(true)
  })

  it('no toca un texto que solo contiene el signo por dentro', () => {
    expect(csvTextCell('Ana-Maria')).toBe('Ana-Maria')
  })
})
