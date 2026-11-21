import { describe, it, expect } from 'vitest'
import {
  checkRegularizationInput,
  normalizeReference,
  REFERENCE_MAX_LENGTH,
  totalOwed,
  type AccountEntry,
} from '../regularization'

const entry = (overrides: Partial<AccountEntry>): AccountEntry => ({
  caseId: 'morosidad-1',
  caseState: 'active',
  appointmentId: 'cita-1',
  pending: 25000,
  since: new Date('2026-11-01T15:00:00Z'),
  request: null,
  ...overrides,
})

describe('checkRegularizationInput', () => {
  it('acepta un monto entero positivo sin referencia', () => {
    expect(checkRegularizationInput({ caseId: 'm', declaredAmount: 1, reference: null })).toBeNull()
  })

  it.each([[0], [-500], [10.5], [Number.NaN]])('rechaza un monto declarado de %s', (declaredAmount) => {
    expect(checkRegularizationInput({ caseId: 'm', declaredAmount, reference: null })).toBe('declared-amount-invalid')
  })

  it('rechaza una referencia de más de 100 caracteres, sin contar los espacios de los bordes', () => {
    const long = 'x'.repeat(REFERENCE_MAX_LENGTH + 1)
    expect(checkRegularizationInput({ caseId: 'm', declaredAmount: 100, reference: long })).toBe('reference-too-long')
    const padded = `  ${'x'.repeat(REFERENCE_MAX_LENGTH)}  `
    expect(checkRegularizationInput({ caseId: 'm', declaredAmount: 100, reference: padded })).toBeNull()
  })
})

describe('normalizeReference', () => {
  it('una referencia hecha de espacios es ninguna referencia', () => {
    expect(normalizeReference('   ')).toBeNull()
    expect(normalizeReference(' SINPE 44 ')).toBe('SINPE 44')
  })
})

describe('totalOwed', () => {
  it('suma lo que deben las morosidades activas y no cuenta las saldadas', () => {
    expect(totalOwed([entry({ pending: 25000 }), entry({ pending: 8000 }), entry({ caseState: 'settled', pending: 0 })])).toBe(33000)
  })
})
