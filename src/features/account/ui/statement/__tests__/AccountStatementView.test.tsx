import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import type { AccountEntry, MyAccount } from '@/features/delinquency'
import { AccountStatementView } from '../components/AccountStatementView'
import { statementMessages as COPY } from '../constants/statement-strings'
import { STUDIO_PAYMENT } from '../constants/studio-payment'

vi.mock('@/features/delinquency', () => ({
  RegularizationForm: (props: { caseId: string; maxAmount: number; hasPendingRequest: boolean }) => (
    <div data-testid="formulario" data-case={props.caseId} data-max={props.maxAmount} data-pending={String(props.hasPendingRequest)} />
  ),
}))

afterEach(cleanup)

const entry = (overrides: Partial<AccountEntry>): AccountEntry => ({
  caseId: '00000000-0000-4000-8000-0000000016d1',
  caseState: 'active',
  appointmentId: '00000000-0000-4000-8000-0000000016e1',
  pending: 25000,
  since: new Date('2026-11-07T18:00:00Z'),
  request: null,
  ...overrides,
})

const account = (entries: AccountEntry[], totalOwed: number): MyAccount => ({ entries, totalOwed })

describe('AccountStatementView', () => {
  it('muestra el total que debe, las instrucciones de pago y cada deuda con su formulario', () => {
    render(<AccountStatementView account={account([entry({})], 25000)} />)

    expect(screen.getByRole('heading', { name: COPY.title })).toBeTruthy()
    expect(screen.getAllByText(/25\s?000/).length).toBeGreaterThan(0)
    expect(screen.getByText(COPY.paymentInstructions)).toBeTruthy()
    expect(screen.getByText(COPY.pendingSince('7 de noviembre de 2026'))).toBeTruthy()
    expect(screen.getByTestId('formulario').dataset).toMatchObject({ case: '00000000-0000-4000-8000-0000000016d1', max: '25000', pending: 'false' })
  })

  it('cómo pagar muestra el SINPE Móvil del estudio, a nombre de quién, y el WhatsApp y el correo para dudas', () => {
    render(<AccountStatementView account={account([entry({})], 25000)} />)

    const box = screen.getByRole('region', { name: COPY.paymentTitle })
    expect(within(box).getByText(STUDIO_PAYMENT.sinpeNumber)).toBeTruthy()
    expect(within(box).getByText(STUDIO_PAYMENT.holder)).toBeTruthy()
    expect(within(box).getByRole('link', { name: COPY.whatsappLink }).getAttribute('href')).toBe('https://wa.me/50661284259')
    expect(within(box).getByRole('link', { name: STUDIO_PAYMENT.email }).getAttribute('href')).toBe(
      'mailto:lasharybeautystudio@gmail.com',
    )
  })

  it('sin deudas lo dice, sin total ni formulario', () => {
    render(<AccountStatementView account={account([], 0)} />)

    expect(screen.getByText(COPY.empty)).toBeTruthy()
    expect(screen.queryByText(COPY.totalLabel)).toBeNull()
    expect(screen.queryByTestId('formulario')).toBeNull()
  })

  it('un fallo al cargar se anuncia como alerta, no como «sin deudas»', () => {
    render(<AccountStatementView error="No pudimos cargar tu estado de cuenta." />)

    expect(screen.getByRole('alert').textContent).toContain('No pudimos cargar')
    expect(screen.queryByText(COPY.empty)).toBeNull()
  })

  it('un comprobante en revisión se ve y el formulario sabe que hay uno pendiente', () => {
    const request = { id: 'r1', state: 'pending_approval' as const, declaredAmount: 10000, approvedAmount: null, rejectionReason: null, reviewedAt: null }
    render(<AccountStatementView account={account([entry({ request })], 25000)} />)

    expect(screen.getByText(/Comprobante en revisión por/)).toBeTruthy()
    expect(screen.getByTestId('formulario').dataset.pending).toBe('true')
  })

  it('un comprobante rechazado muestra el motivo', () => {
    const request = { id: 'r1', state: 'rejected' as const, declaredAmount: 10000, approvedAmount: null, rejectionReason: 'No se lee', reviewedAt: new Date() }
    render(<AccountStatementView account={account([entry({ request })], 25000)} />)

    expect(screen.getByText(COPY.rejected('No se lee'))).toBeTruthy()
  })

  it('una deuda saldada se ve como saldada, con el pago que la saldó, y ya no pide comprobante ni muestra cómo pagar', () => {
    const request = { id: 'r1', state: 'approved' as const, declaredAmount: 15000, approvedAmount: 15000, rejectionReason: null, reviewedAt: new Date() }
    render(<AccountStatementView account={account([entry({ caseState: 'settled', pending: 0, request })], 0)} />)

    expect(screen.getByText(COPY.empty)).toBeTruthy()
    expect(screen.queryByText(COPY.totalLabel)).toBeNull()
    expect(screen.queryByText(COPY.paymentInstructions)).toBeNull()
    expect(screen.queryByText(STUDIO_PAYMENT.sinpeNumber)).toBeNull()
    const card = screen.getByRole('listitem')
    expect(within(card).getAllByText(COPY.settled)).toHaveLength(1)
    expect(within(card).getByText(/Pago aprobado por ₡15\s?000/)).toBeTruthy()
    expect(within(card).queryByTestId('formulario')).toBeNull()
  })
})
