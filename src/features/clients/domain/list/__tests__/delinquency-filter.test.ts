import { describe, it, expect } from 'vitest'
import { DELINQUENCY_FILTER_VALUES, readDelinquencyFilter } from '../delinquency-filter'

describe('readDelinquencyFilter', () => {
  it('acepta cada uno de los valores del filtro', () => {
    for (const filter of DELINQUENCY_FILTER_VALUES) {
      expect(readDelinquencyFilter(filter)).toBe(filter)
    }
  })

  it('ofrece activa, por revisar y sin morosidad, y no el estado descartado (DOM-012)', () => {
    expect(DELINQUENCY_FILTER_VALUES).toEqual(['active', 'pending_review', 'none'])
  })

  it('un valor ausente, desconocido o que no es texto no filtra', () => {
    for (const value of [undefined, null, '', ' active', 'Active', 'dismissed', 'todas', 0, {}]) {
      expect(readDelinquencyFilter(value)).toBeNull()
    }
  })
})
