import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import { CheckoutForm } from '../components/CheckoutForm'
import { RECEIPT_MAX_BYTES } from '@/features/store/domain/receipt'
import { RECEIPT_ACCEPT, checkoutMessages as COPY, receiptProblemMessages } from '../constants/checkout-strings'
import type { CheckoutActionResult } from '../types/checkout-results'

const TOTAL_LABEL = 'Total a pagar: ₡4 000'
const mockSubmit = vi.fn<(previous: CheckoutActionResult | null, formData: FormData) => Promise<CheckoutActionResult>>()

vi.mock('../actions/checkout-actions', () => ({
  checkoutAction: (previous: CheckoutActionResult | null, formData: FormData) => mockSubmit(previous, formData),
}))

beforeEach(() => mockSubmit.mockReset())
afterEach(cleanup)

const submit = () => fireEvent.submit(screen.getByRole('button', { name: COPY.submit }).closest('form')!)

describe('CheckoutForm', () => {
  it('pide teléfono y comprobante; avisa que por ahora solo hay retiro en el estudio', () => {
    render(<CheckoutForm totalLabel={TOTAL_LABEL} isCartEmpty={false} />)

    expect(screen.getByText(TOTAL_LABEL)).toBeTruthy()
    expect(screen.getByLabelText(COPY.contactPhoneLabel).hasAttribute('required')).toBe(true)
    expect(screen.getByText(COPY.deliveryNotice)).toBeTruthy()
    const receipt = screen.getByLabelText(COPY.receiptLabel)
    expect([receipt.getAttribute('accept'), receipt.hasAttribute('required')]).toEqual([RECEIPT_ACCEPT, true])
  })

  it('un comprobante de más de 1 MB se marca inválido al elegirlo, antes de enviar nada', () => {
    render(<CheckoutForm totalLabel={TOTAL_LABEL} isCartEmpty={false} />)
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

  it('envía el teléfono, y anuncia la respuesta', async () => {
    mockSubmit.mockResolvedValue({ ok: true, message: COPY.sent })
    render(<CheckoutForm totalLabel={TOTAL_LABEL} isCartEmpty={false} />)

    fireEvent.change(screen.getByLabelText(COPY.contactPhoneLabel), { target: { value: '88887012' } })
    submit()

    expect((await screen.findByRole('status')).textContent).toContain(COPY.sent)
    const formData = mockSubmit.mock.calls[0][1]
    expect(formData.get('contactPhone')).toBe('88887012')
  })

  it('un rechazo se anuncia como alerta', async () => {
    mockSubmit.mockResolvedValue({ ok: false, message: COPY.missingReceipt })
    render(<CheckoutForm totalLabel={TOTAL_LABEL} isCartEmpty={false} />)

    submit()

    expect((await screen.findByRole('alert')).textContent).toContain(COPY.missingReceipt)
  })

  it('con el carrito vacío de entrada, muestra el carrito vacío en vez del formulario', () => {
    render(<CheckoutForm totalLabel={TOTAL_LABEL} isCartEmpty />)

    expect(screen.queryByLabelText(COPY.contactPhoneLabel)).toBeNull()
  })

  it('tras un pedido exitoso, la confirmación se queda aunque el carrito (ya vacío) refresque la página', async () => {
    mockSubmit.mockResolvedValue({ ok: true, message: COPY.sent })
    const { rerender } = render(<CheckoutForm totalLabel={TOTAL_LABEL} isCartEmpty={false} />)

    submit()
    expect((await screen.findByRole('status')).textContent).toContain(COPY.sent)

    rerender(<CheckoutForm totalLabel={TOTAL_LABEL} isCartEmpty />)

    expect(screen.getByRole('status').textContent).toContain(COPY.sent)
  })

  it('tras un pedido exitoso, el formulario desaparece: no queda botón para reenviar y pisar la confirmación', async () => {
    mockSubmit.mockResolvedValue({ ok: true, message: COPY.sent })
    render(<CheckoutForm totalLabel={TOTAL_LABEL} isCartEmpty={false} />)

    submit()
    await screen.findByRole('status')

    expect(screen.queryByRole('button', { name: COPY.submit })).toBeNull()
    expect(screen.queryByLabelText(COPY.receiptLabel)).toBeNull()
    expect(mockSubmit).toHaveBeenCalledTimes(1)
  })
})
