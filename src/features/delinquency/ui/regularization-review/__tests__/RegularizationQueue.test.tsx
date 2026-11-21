import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import type { QueueItem } from '@/features/delinquency/domain/regularization'
import { reviewMessages } from '../../review/constants/review-strings'
import { RegularizationQueue } from '../components/RegularizationQueue'
import { QUEUE_LIMIT, queueMessages as copy } from '../constants/queue-strings'

vi.mock('../actions/review-actions', () => ({
  approveRegularizationAction: vi.fn(),
  rejectRegularizationAction: vi.fn(),
}))

afterEach(cleanup)

const item = (overrides: Partial<QueueItem> = {}): QueueItem => ({
  requestId: 'solicitud-1',
  caseId: 'morosidad-1',
  clientId: 'clienta-1',
  clientName: 'Ana Pérez',
  declaredAmount: 10000,
  reference: 'SINPE 4455',
  receiptPath: 'clienta-1/r.pdf',
  receiptUrl: 'https://firmado/r.pdf',
  pendingToday: 25000,
  submittedAt: new Date('2026-11-16T21:30:00Z'),
  ...overrides,
})

const ready = (items: QueueItem[], more = false) => ({ status: 'ready' as const, queue: { items, more } })

describe('RegularizationQueue', () => {
  it('muestra cada comprobante con lo declarado, lo que debe hoy, la fecha, la referencia y el aviso de verificar', () => {
    render(<RegularizationQueue model={ready([item()])} />)

    expect(screen.getByRole('heading', { name: copy.title })).toBeTruthy()
    expect(screen.getByRole('note').textContent).toBe(copy.hint)
    const card = screen.getByRole('listitem')
    expect(within(card).getByRole('heading', { name: 'Ana Pérez' })).toBeTruthy()
    expect(within(card).getAllByText(/10\s?000/).length).toBeGreaterThan(0)
    expect(within(card).getAllByText(/25\s?000/).length).toBeGreaterThan(0)
    expect(within(card).getByRole('button', { name: 'Aprobar pago' })).toBeTruthy()
    expect(within(card).getByText('SINPE 4455')).toBeTruthy()
  })

  it('el comprobante se abre en otra pestaña con un nombre que dice de quién es', () => {
    render(<RegularizationQueue model={ready([item()])} />)

    const link = screen.getByRole('link', { name: copy.openReceiptLabel('Ana Pérez') })
    expect([link.getAttribute('href'), link.getAttribute('target'), link.getAttribute('rel')]).toEqual([
      'https://firmado/r.pdf',
      '_blank',
      'noopener noreferrer',
    ])
  })

  it('sin enlace firmado lo dice y no muestra un enlace roto; sin nombre usa el genérico', () => {
    render(<RegularizationQueue model={ready([item({ receiptUrl: null, clientName: null, reference: null })])} />)

    expect(screen.getByText(copy.receiptUnavailable)).toBeTruthy()
    expect(screen.queryByRole('link', { name: /comprobante/ })).toBeNull()
    expect(screen.getByRole('heading', { name: reviewMessages.clientFallback })).toBeTruthy()
    expect(screen.queryByText(copy.referenceLabel)).toBeNull()
  })

  it('sin comprobantes lo dice, sin el aviso de verificar', () => {
    render(<RegularizationQueue model={ready([])} />)

    expect(screen.getByText(copy.empty)).toBeTruthy()
    expect(screen.queryByRole('note')).toBeNull()
  })

  it('si hay más de los que se muestran, lo avisa', () => {
    render(<RegularizationQueue model={ready([item()], true)} />)

    expect(screen.getByText(copy.more(QUEUE_LIMIT))).toBeTruthy()
  })

  it('un fallo al cargar es una alerta con reintento, no una cola vacía', () => {
    render(<RegularizationQueue model={{ status: 'error' }} />)

    expect(screen.getByRole('alert').textContent).toContain(copy.loadError)
    expect(screen.queryByText(copy.empty)).toBeNull()
  })
})
