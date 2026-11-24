import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { LedgerExportForm } from '../components/LedgerExportForm'
import {
  LEDGER_EXPORT_ERROR_REASONS,
  LEDGER_EXPORT_ROUTE,
  isLedgerExportErrorReason,
  ledgerExportMessages,
} from '../constants/ledger-export-strings'

describe('LedgerExportForm', () => {
  it('es un formulario GET hacia la ruta con dos fechas rotuladas y obligatorias', () => {
    const { container } = render(<LedgerExportForm />)
    const form = container.querySelector('form')

    expect(form?.getAttribute('method')).toBe('get')
    expect(form?.getAttribute('action')).toBe(LEDGER_EXPORT_ROUTE)
    const from = screen.getByLabelText(ledgerExportMessages.fromLabel) as HTMLInputElement
    const to = screen.getByLabelText(ledgerExportMessages.toLabel) as HTMLInputElement
    expect([from.type, from.name, from.required]).toEqual(['date', 'desde', true])
    expect([to.type, to.name, to.required]).toEqual(['date', 'hasta', true])
  })

  it('tiene el título de la sección, el botón de descarga y ningún aviso sin error', () => {
    render(<LedgerExportForm />)

    expect(screen.getByRole('region', { name: ledgerExportMessages.title })).toBeTruthy()
    expect(screen.getByRole('button', { name: ledgerExportMessages.submit })).toBeTruthy()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it.each(LEDGER_EXPORT_ERROR_REASONS)('muestra el aviso del motivo %s', (reason) => {
    render(<LedgerExportForm errorReason={reason} />)

    expect(screen.getByRole('alert').textContent).toBe(ledgerExportMessages.errors[reason])
  })

  it('solo acepta los motivos conocidos que llegan por la URL', () => {
    expect(LEDGER_EXPORT_ERROR_REASONS.every(isLedgerExportErrorReason)).toBe(true)
    expect([undefined, 'toString', ['range'], 'otro'].some(isLedgerExportErrorReason)).toBe(false)
  })
})
