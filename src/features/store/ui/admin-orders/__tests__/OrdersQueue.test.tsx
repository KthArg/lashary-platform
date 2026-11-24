import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import type { OrderQueueEntry } from '@/features/store/application/admin-orders/load-order-queue'
import { OrdersQueue } from '../components/OrdersQueue'
import { orderQueueMessages as copy } from '../constants/order-queue-strings'

vi.mock('../actions/order-review-actions', () => ({
  approveOrderAction: vi.fn(),
  rejectOrderAction: vi.fn(),
}))

afterEach(cleanup)

const order = (overrides: Partial<OrderQueueEntry> = {}): OrderQueueEntry => ({
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
  lines: [{ productId: 'p1', productName: 'Serum', unitPrice: { colones: 1000 } as never, quantity: 2 }],
  ...overrides,
})

const ready = (orders: OrderQueueEntry[]) => ({ status: 'ready' as const, orders })

describe('OrdersQueue', () => {
  it('muestra cada pedido con el total, el contacto y sus líneas', () => {
    render(<OrdersQueue model={ready([order()])} />)

    expect(screen.getByRole('heading', { name: copy.title })).toBeTruthy()
    expect(screen.getByRole('note').textContent).toBe(copy.hint)
    const card = screen.getByRole('listitem')
    expect(within(card).getByRole('heading', { name: 'Ana Pérez' })).toBeTruthy()
    expect(within(card).getAllByText(/4\s?000/).length).toBeGreaterThan(0)
    expect(within(card).getByText('88887012')).toBeTruthy()
    expect(within(card).getByText('Serum × 2')).toBeTruthy()
    expect(within(card).getByRole('button', { name: 'Aprobar pedido' })).toBeTruthy()
  })

  it('el comprobante se abre en otra pestaña con un nombre que dice de quién es', () => {
    render(<OrdersQueue model={ready([order()])} />)

    const link = screen.getByRole('link', { name: copy.openReceiptLabel('Ana Pérez') })
    expect([link.getAttribute('href'), link.getAttribute('target'), link.getAttribute('rel')]).toEqual([
      'https://firmado/r.jpg',
      '_blank',
      'noopener noreferrer',
    ])
  })

  it('sin URL firmada lo dice y no muestra un enlace roto; sin nombre usa el genérico', () => {
    render(<OrdersQueue model={ready([order({ receiptUrl: null, clientName: null })])} />)

    expect(screen.getByText(copy.receiptUnavailable)).toBeTruthy()
    expect(screen.queryByRole('link', { name: /comprobante/ })).toBeNull()
    expect(screen.getByRole('heading', { name: copy.clientFallback })).toBeTruthy()
  })

  it('sin pedidos pendientes lo dice, sin el aviso de verificar', () => {
    render(<OrdersQueue model={ready([])} />)

    expect(screen.getByText(copy.empty)).toBeTruthy()
    expect(screen.queryByRole('note')).toBeNull()
  })

  it('un fallo al cargar es una alerta con reintento, no una cola vacía', () => {
    render(<OrdersQueue model={{ status: 'error' }} />)

    expect(screen.getByRole('alert').textContent).toContain(copy.loadError)
    expect(screen.queryByText(copy.empty)).toBeNull()
  })
})
