import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { QueueFeedback } from '../components/QueueFeedback'
import { OrderDecision } from '../components/OrderDecision'
import { orderDecisionMessages as copy } from '../constants/order-queue-strings'
import type { OrderReviewActionResult } from '../types/order-review-results'

const ORDER_ID = '00000000-0000-4000-8000-000000000e01'
const mockApprove = vi.fn<(previous: OrderReviewActionResult | null, formData: FormData) => Promise<OrderReviewActionResult>>()
const mockReject = vi.fn<(previous: OrderReviewActionResult | null, formData: FormData) => Promise<OrderReviewActionResult>>()

vi.mock('../actions/order-review-actions', () => ({
  approveOrderAction: (previous: OrderReviewActionResult | null, formData: FormData) => mockApprove(previous, formData),
  rejectOrderAction: (previous: OrderReviewActionResult | null, formData: FormData) => mockReject(previous, formData),
}))

beforeEach(() => {
  mockApprove.mockReset()
  mockReject.mockReset()
})
afterEach(cleanup)

const renderDecision = () =>
  render(
    <QueueFeedback>
      <OrderDecision orderId={ORDER_ID} />
    </QueueFeedback>,
  )

describe('OrderDecision', () => {
  it('aprobar manda el id del pedido y anuncia el resultado arriba de la cola', async () => {
    mockApprove.mockResolvedValue({ ok: true, message: copy.approved })
    renderDecision()

    fireEvent.submit(screen.getByRole('button', { name: copy.approve }).closest('form')!)

    expect(await screen.findByText(copy.approved)).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe(copy.approved)
    expect(mockApprove.mock.calls[0][1].get('orderId')).toBe(ORDER_ID)
    expect(mockReject).not.toHaveBeenCalled()
  })

  it('rechazar exige un motivo de 10 a 500 caracteres, lo manda, y un error se anuncia como alerta', async () => {
    mockReject.mockResolvedValue({ ok: false, message: 'Este pedido ya se revisó.' })
    renderDecision()

    const reason = screen.getByLabelText(copy.reasonLabel)
    expect(reason.hasAttribute('required')).toBe(true)
    expect([reason.getAttribute('minlength'), reason.getAttribute('maxlength')]).toEqual(['10', '500'])
    fireEvent.change(reason, { target: { value: 'El comprobante no corresponde' } })
    fireEvent.submit(screen.getByRole('button', { name: copy.reject }).closest('form')!)

    expect((await screen.findByRole('alert')).textContent).toContain('ya se revisó')
    const formData = mockReject.mock.calls[0][1]
    expect([formData.get('orderId'), formData.get('reason')]).toEqual([ORDER_ID, 'El comprobante no corresponde'])
  })
})
