import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import type { OrderHistoryEntry } from '@/features/store/application/admin-orders/load-order-queue'
import { OrdersHistory } from '../components/OrdersHistory'
import { orderHistoryMessages as copy, orderStateLabels } from '../constants/order-queue-strings'

afterEach(cleanup)

const order = (overrides: Partial<OrderHistoryEntry> = {}): OrderHistoryEntry => ({
  id: 'pedido-1',
  clientId: 'clienta-1',
  clientName: 'Ana Pérez',
  contactPhone: '88887012',
  deliveryMethod: 'pickup',
  deliveryAddress: null,
  totalColones: 4000,
  receiptPath: 'clienta-1/r.jpg',
  receiptUrl: 'https://firmado/r.jpg',
  createdAt: new Date('2026-11-23T21:30:00Z'),
  state: 'approved',
  rejectionReason: null,
  reviewedAt: new Date('2026-11-24T08:00:00Z'),
  lines: [{ productId: 'p1', productName: 'Serum', unitPrice: { colones: 1000 } as never, quantity: 2 }],
  ...overrides,
})

const ready = (items: OrderHistoryEntry[], page = 0, pageSize = 20, total = items.length) => ({
  status: 'ready' as const,
  items,
  page,
  pageSize,
  total,
})

describe('OrdersHistory', () => {
  it('muestra cada pedido con su estado, total, contacto y líneas, sin botones de revisión', () => {
    render(<OrdersHistory model={ready([order()])} />)

    expect(screen.getByRole('heading', { name: copy.title })).toBeTruthy()
    const card = screen.getByRole('listitem')
    expect(within(card).getByRole('heading', { name: 'Ana Pérez' })).toBeTruthy()
    expect(within(card).getByText(orderStateLabels.approved)).toBeTruthy()
    expect(within(card).getAllByText(/4\s?000/).length).toBeGreaterThan(0)
    expect(within(card).getByText('Serum × 2')).toBeTruthy()
    expect(within(card).queryByRole('button')).toBeNull()
  })

  it('un pedido rechazado muestra su motivo', () => {
    const reason = 'El comprobante no corresponde al monto'
    render(<OrdersHistory model={ready([order({ state: 'rejected', rejectionReason: reason })])} />)

    expect(screen.getByText(`${copy.rejectionReasonLabel}: ${reason}`)).toBeTruthy()
  })

  it('un pedido pendiente no muestra motivo de rechazo ni fecha de revisión', () => {
    render(<OrdersHistory model={ready([order({ state: 'pending_approval', rejectionReason: null, reviewedAt: null })])} />)

    expect(screen.queryByText(copy.rejectionReasonLabel, { exact: false })).toBeNull()
    expect(screen.queryByText(copy.reviewedLabel)).toBeNull()
  })

  it('sin pedidos en el historial lo dice', () => {
    render(<OrdersHistory model={ready([])} />)

    expect(screen.getByText(copy.empty)).toBeTruthy()
  })

  it('un fallo al cargar es una alerta con reintento', () => {
    render(<OrdersHistory model={{ status: 'error' }} />)

    expect(screen.getByRole('alert').textContent).toContain(copy.loadError)
  })

  it('con más de una página, muestra la paginación', () => {
    render(<OrdersHistory model={ready([order()], 0, 20, 45)} />)

    expect(screen.getByRole('navigation', { name: copy.paginationLabel })).toBeTruthy()
    expect(screen.getByText(copy.pageStatus(1, 3))).toBeTruthy()
  })
})
