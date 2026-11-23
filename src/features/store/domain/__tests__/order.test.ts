import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { moneyFromColones } from '@/shared/money'
import { buildCheckoutDetails, orderLineTotal, orderTotal, validateRejectionReason } from '../order'
import type { OrderLine } from '../order'

describe('buildCheckoutDetails', () => {
  it('acepta retiro sin dirección', () => {
    const result = buildCheckoutDetails({
      contactPhone: '88887012',
      deliveryMethod: 'pickup',
      deliveryAddress: null,
    })
    expect(isOk(result) && result.value.deliveryAddress).toBeNull()
  })

  it('recorta espacios del teléfono', () => {
    const result = buildCheckoutDetails({
      contactPhone: '  88887012  ',
      deliveryMethod: 'pickup',
      deliveryAddress: null,
    })
    expect(isOk(result) && result.value.contactPhone).toBe('88887012')
  })

  it('rechaza un teléfono de menos de 8 caracteres', () => {
    const result = buildCheckoutDetails({ contactPhone: '123', deliveryMethod: 'pickup', deliveryAddress: null })
    expect(isErr(result) && result.error.code).toBe('STORE_PEDIDO_TELEFONO_INVALIDO')
  })

  it('rechaza un teléfono de más de 20 caracteres', () => {
    const result = buildCheckoutDetails({
      contactPhone: '1'.repeat(21),
      deliveryMethod: 'pickup',
      deliveryAddress: null,
    })
    expect(isErr(result) && result.error.code).toBe('STORE_PEDIDO_TELEFONO_INVALIDO')
  })

  it('exige dirección cuando el método es envío', () => {
    const result = buildCheckoutDetails({ contactPhone: '88887012', deliveryMethod: 'shipping', deliveryAddress: null })
    expect(isErr(result) && result.error.code).toBe('STORE_PEDIDO_DIRECCION_REQUERIDA')
  })

  it('rechaza una dirección solo con espacios', () => {
    const result = buildCheckoutDetails({ contactPhone: '88887012', deliveryMethod: 'shipping', deliveryAddress: '   ' })
    expect(isErr(result) && result.error.code).toBe('STORE_PEDIDO_DIRECCION_REQUERIDA')
  })

  it('acepta envío con dirección y la recorta', () => {
    const result = buildCheckoutDetails({
      contactPhone: '88887012',
      deliveryMethod: 'shipping',
      deliveryAddress: '  San José  ',
    })
    expect(isOk(result) && result.value.deliveryAddress).toBe('San José')
  })

  it('rechaza una dirección de más de 300 caracteres', () => {
    const result = buildCheckoutDetails({
      contactPhone: '88887012',
      deliveryMethod: 'shipping',
      deliveryAddress: 'x'.repeat(301),
    })
    expect(isErr(result) && result.error.code).toBe('STORE_PEDIDO_DIRECCION_REQUERIDA')
  })

  it('una dirección recibida con retiro se ignora: nunca se guarda', () => {
    const result = buildCheckoutDetails({
      contactPhone: '88887012',
      deliveryMethod: 'pickup',
      deliveryAddress: 'San José',
    })
    expect(isOk(result) && result.value.deliveryAddress).toBeNull()
  })
})

describe('validateRejectionReason', () => {
  it('rechaza un motivo de menos de 10 caracteres', () => {
    const result = validateRejectionReason('corto')
    expect(isErr(result) && result.error.code).toBe('STORE_PEDIDO_MOTIVO_RECHAZO_INVALIDO')
  })

  it('rechaza un motivo de más de 500 caracteres', () => {
    const result = validateRejectionReason('x'.repeat(501))
    expect(isErr(result)).toBe(true)
  })

  it('acepta y recorta un motivo válido', () => {
    const result = validateRejectionReason('  El comprobante no corresponde al monto  ')
    expect(isOk(result) && result.value).toBe('El comprobante no corresponde al monto')
  })
})

describe('orderLineTotal y orderTotal', () => {
  const lineOf = (unitPriceColones: number, quantity: number): OrderLine => ({
    productId: 'p1',
    productName: 'Serum',
    unitPrice: moneyFromColones(unitPriceColones),
    quantity,
  })

  it('multiplica precio unitario por cantidad', () => {
    expect(orderLineTotal(lineOf(1000, 3)).colones).toBe(3000)
  })

  it('suma el total de todas las líneas', () => {
    const lines = [lineOf(1000, 2), lineOf(2000, 1)]
    expect(orderTotal(lines).colones).toBe(4000)
  })

  it('un pedido sin líneas totaliza cero', () => {
    expect(orderTotal([]).colones).toBe(0)
  })
})
