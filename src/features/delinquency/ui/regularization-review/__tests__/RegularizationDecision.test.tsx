import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { QueueFeedback } from '../components/QueueFeedback'
import { RegularizationDecision } from '../components/RegularizationDecision'
import { decisionMessages as copy } from '../constants/queue-strings'
import type { ReviewActionResult } from '../types/review-results'

const REQUEST_ID = '00000000-0000-4000-8000-0000000016f1'
const mockApprove = vi.fn<(previous: ReviewActionResult | null, formData: FormData) => Promise<ReviewActionResult>>()
const mockReject = vi.fn<(previous: ReviewActionResult | null, formData: FormData) => Promise<ReviewActionResult>>()

vi.mock('../actions/review-actions', () => ({
  approveRegularizationAction: (previous: ReviewActionResult | null, formData: FormData) => mockApprove(previous, formData),
  rejectRegularizationAction: (previous: ReviewActionResult | null, formData: FormData) => mockReject(previous, formData),
}))

beforeEach(() => {
  mockApprove.mockReset()
  mockReject.mockReset()
})
afterEach(cleanup)

const renderDecision = () =>
  render(
    <QueueFeedback>
      <RegularizationDecision requestId={REQUEST_ID} declaredAmount={10000} pendingToday={25000} />
    </QueueFeedback>,
  )

describe('RegularizationDecision', () => {
  it('el monto a aprobar empieza vacío, con lo declarado y lo que debe hoy como referencia', () => {
    renderDecision()

    const amount = screen.getByLabelText(copy.amountLabel) as HTMLInputElement
    expect(amount.value).toBe('')
    expect([amount.getAttribute('min'), amount.getAttribute('max')]).toEqual(['1', '25000'])
    const hint = document.getElementById(amount.getAttribute('aria-describedby')!)
    expect(hint?.textContent).toMatch(/declara ₡10\s?000.*debe hoy ₡25\s?000/)
  })

  it('aprobar manda la solicitud y el monto escrito, y anuncia el resultado arriba de la cola, que sobrevive a la recarga', async () => {
    mockApprove.mockResolvedValue({ ok: true, message: copy.approvedSettled })
    renderDecision()

    fireEvent.change(screen.getByLabelText(copy.amountLabel), { target: { value: '25000' } })
    fireEvent.submit(screen.getByRole('button', { name: copy.approve }).closest('form')!)

    expect(await screen.findByText(copy.approvedSettled)).toBeTruthy()
    expect(screen.getByRole('status').textContent).toBe(copy.approvedSettled)
    const formData = mockApprove.mock.calls[0][1]
    expect([formData.get('requestId'), formData.get('approvedAmount')]).toEqual([REQUEST_ID, '25000'])
    expect(mockReject).not.toHaveBeenCalled()
  })

  it('rechazar exige un motivo, lo manda, y un error se anuncia como alerta', async () => {
    mockReject.mockResolvedValue({ ok: false, message: 'Esta solicitud ya se revisó.' })
    renderDecision()

    const reason = screen.getByLabelText(copy.reasonLabel)
    expect(reason.hasAttribute('required')).toBe(true)
    fireEvent.change(reason, { target: { value: 'El comprobante no se lee' } })
    fireEvent.submit(screen.getByRole('button', { name: copy.reject }).closest('form')!)

    expect((await screen.findByRole('alert')).textContent).toContain('ya se revisó')
    expect(mockReject.mock.calls[0][1].get('reason')).toBe('El comprobante no se lee')
  })
})
