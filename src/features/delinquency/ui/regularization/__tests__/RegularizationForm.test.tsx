import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { RegularizationForm } from '../components/RegularizationForm'
import { RECEIPT_MAX_BYTES } from '@/features/delinquency/domain/receipt'
import { RECEIPT_ACCEPT, receiptProblemMessages, regularizationFormMessages as COPY } from '../constants/regularization-strings'
import type { SubmitRegularizationResult } from '../types/regularization-results'

const CASE_ID = '00000000-0000-4000-8000-0000000016d1'
const mockSubmit = vi.fn<(previous: SubmitRegularizationResult | null, formData: FormData) => Promise<SubmitRegularizationResult>>()

vi.mock('../actions/regularization-actions', () => ({
  submitRegularizationAction: (previous: SubmitRegularizationResult | null, formData: FormData) => mockSubmit(previous, formData),
}))

beforeEach(() => mockSubmit.mockReset())
afterEach(cleanup)

const submit = () => fireEvent.submit(screen.getByRole('button', { name: COPY.submit }).closest('form')!)

describe('RegularizationForm', () => {
  it('pide el monto entre 1 y lo que debe, la referencia opcional y el comprobante como foto o PDF', () => {
    render(<RegularizationForm caseId={CASE_ID} maxAmount={25000} hasPendingRequest={false} />)

    const amount = screen.getByLabelText(COPY.amountLabel)
    expect([amount.getAttribute('min'), amount.getAttribute('max'), amount.hasAttribute('required')]).toEqual(['1', '25000', true])
    expect(screen.getByLabelText(COPY.referenceLabel).hasAttribute('required')).toBe(false)
    const receipt = screen.getByLabelText(COPY.receiptLabel)
    expect([receipt.getAttribute('accept'), receipt.hasAttribute('required')]).toEqual([RECEIPT_ACCEPT, true])
    expect(screen.queryByText(COPY.replaceHint)).toBeNull()
  })

  it('un archivo de más de 1 MB se marca inválido al elegirlo, antes de enviar nada', () => {
    render(<RegularizationForm caseId={CASE_ID} maxAmount={25000} hasPendingRequest={false} />)
    const receipt = screen.getByLabelText(COPY.receiptLabel) as HTMLInputElement
    const choose = (bytes: number) => {
      Object.defineProperty(receipt, 'files', { configurable: true, value: [new File([new Uint8Array(bytes)], 'sinpe.jpg')] })
      fireEvent.change(receipt)
    }

    choose(RECEIPT_MAX_BYTES + 1)
    expect(receipt.validity.customError).toBe(true)
    expect(receipt.validationMessage).toBe(receiptProblemMessages['receipt-too-large'])

    choose(RECEIPT_MAX_BYTES)
    expect(receipt.validity.customError).toBe(false)
    expect(mockSubmit).not.toHaveBeenCalled()
  })

  it('con un comprobante en revisión avisa que enviar otro lo reemplaza', () => {
    render(<RegularizationForm caseId={CASE_ID} maxAmount={25000} hasPendingRequest />)

    const hint = screen.getByText(COPY.replaceHint)
    expect(screen.getByLabelText(COPY.receiptLabel).getAttribute('aria-describedby')).toBe(hint.id)
  })

  it('envía la morosidad y el monto, y anuncia la respuesta', async () => {
    mockSubmit.mockResolvedValue({ ok: true, message: 'Recibimos tu comprobante.' })
    render(<RegularizationForm caseId={CASE_ID} maxAmount={25000} hasPendingRequest={false} />)

    fireEvent.change(screen.getByLabelText(COPY.amountLabel), { target: { value: '10000' } })
    submit()

    expect((await screen.findByRole('status')).textContent).toContain('Recibimos tu comprobante.')
    const formData = mockSubmit.mock.calls[0][1]
    expect([formData.get('caseId'), formData.get('declaredAmount')]).toEqual([CASE_ID, '10000'])
  })

  it('un rechazo se anuncia como alerta', async () => {
    mockSubmit.mockResolvedValue({ ok: false, message: 'El comprobante pesa más de 1 MB.' })
    render(<RegularizationForm caseId={CASE_ID} maxAmount={25000} hasPendingRequest={false} />)

    submit()

    expect((await screen.findByRole('alert')).textContent).toContain('pesa más de 1 MB')
  })
})
