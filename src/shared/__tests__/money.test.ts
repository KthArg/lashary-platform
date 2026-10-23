import { describe, it, expect } from 'vitest'
import {
  addMoney,
  formatMoney,
  isNegativeMoney,
  isPositiveMoney,
  isZeroMoney,
  moneyEquals,
  moneyFromColones,
  subtractMoney,
  zeroMoney,
} from '@/shared/money'

describe('Money — DOM-001: entero de colones, float prohibido', () => {
  it('crea un monto desde un entero de colones', () => {
    expect(moneyFromColones(15000).colones).toBe(15000)
  })

  it('acepta cero', () => {
    expect(zeroMoney().colones).toBe(0)
    expect(isZeroMoney(moneyFromColones(0))).toBe(true)
  })

  it('rechaza un float — el bug de centavos perdidos queda irrepresentable', () => {
    expect(() => moneyFromColones(15000.5)).toThrow(RangeError)
    expect(() => moneyFromColones(0.1)).toThrow(RangeError)
  })

  it('rechaza NaN e Infinity', () => {
    expect(() => moneyFromColones(Number.NaN)).toThrow(RangeError)
    expect(() => moneyFromColones(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })

  it('admite montos negativos (contra-asientos del ledger, DOM-005) y los identifica', () => {
    const refund = moneyFromColones(-5000)
    expect(refund.colones).toBe(-5000)
    expect(isNegativeMoney(refund)).toBe(true)
    expect(isPositiveMoney(refund)).toBe(false)
  })

  it('suma y resta manteniéndose entero', () => {
    const total = addMoney(moneyFromColones(10000), moneyFromColones(2500))
    expect(total.colones).toBe(12500)
    expect(subtractMoney(total, moneyFromColones(500)).colones).toBe(12000)
  })

  it('compara por valor', () => {
    expect(moneyEquals(moneyFromColones(100), moneyFromColones(100))).toBe(true)
    expect(moneyEquals(moneyFromColones(100), moneyFromColones(101))).toBe(false)
  })

  it('isPositiveMoney distingue estrictamente de cero', () => {
    expect(isPositiveMoney(moneyFromColones(1))).toBe(true)
    expect(isPositiveMoney(zeroMoney())).toBe(false)
  })

  it('se formatea en colones para display', () => {
    expect(formatMoney(moneyFromColones(15000))).toContain('15')
  })
})
