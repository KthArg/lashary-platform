import { describe, it, expect } from 'vitest'
import { Money } from '@/shared/money'

describe('Money — DOM-001: entero de colones, float prohibido', () => {
  it('crea un monto desde un entero de colones', () => {
    expect(Money.fromColones(15000).colones).toBe(15000)
  })

  it('acepta cero', () => {
    expect(Money.zero().colones).toBe(0)
    expect(Money.fromColones(0).isZero()).toBe(true)
  })

  it('rechaza un float — el bug de centavos perdidos queda irrepresentable', () => {
    expect(() => Money.fromColones(15000.5)).toThrow(RangeError)
    expect(() => Money.fromColones(0.1)).toThrow(RangeError)
  })

  it('rechaza NaN e Infinity', () => {
    expect(() => Money.fromColones(Number.NaN)).toThrow(RangeError)
    expect(() => Money.fromColones(Number.POSITIVE_INFINITY)).toThrow(RangeError)
  })

  it('admite montos negativos (contra-asientos del ledger, DOM-005) y los identifica', () => {
    const m = Money.fromColones(-5000)
    expect(m.colones).toBe(-5000)
    expect(m.isNegative()).toBe(true)
    expect(m.isPositive()).toBe(false)
  })

  it('suma y resta manteniéndose entero', () => {
    const total = Money.fromColones(10000).plus(Money.fromColones(2500))
    expect(total.colones).toBe(12500)
    expect(total.minus(Money.fromColones(500)).colones).toBe(12000)
  })

  it('compara por valor', () => {
    expect(Money.fromColones(100).equals(Money.fromColones(100))).toBe(true)
    expect(Money.fromColones(100).equals(Money.fromColones(101))).toBe(false)
  })

  it('isPositive distingue estrictamente de cero', () => {
    expect(Money.fromColones(1).isPositive()).toBe(true)
    expect(Money.zero().isPositive()).toBe(false)
  })

  it('se formatea en colones para display', () => {
    expect(Money.fromColones(15000).toString()).toContain('15')
  })
})
