import { describe, it, expect } from 'vitest'
import { groupPrecautions } from '../precaution-groups'
import { DEFAULT_PRECAUTION_ICON } from '../constants/record-icons'
import { ALLERGY, SENSITIVITY } from '../../../domain/record/__tests__/record-fixtures'

const ALLERGY_CATEGORY = { id: ALLERGY.categoryId, name: 'Alergia' }
const CONDITION_CATEGORY = { id: 'category-condition', name: 'Condición relevante' }

describe('groupPrecautions — una tarjeta por categoría (criterio 2)', () => {
  it('cada categoría tiene su tarjeta con título en plural y sus antecedentes, aunque esté vacía', () => {
    const groups = groupPrecautions([ALLERGY_CATEGORY, CONDITION_CATEGORY], [ALLERGY])
    expect(groups.map((group) => [group.title, group.precautions.length])).toEqual([
      ['Alergias', 1],
      ['Condiciones relevantes', 0],
    ])
  })

  it('un antecedente cuya categoría no llegó en la lista igual se muestra, con su nombre guardado', () => {
    const groups = groupPrecautions([ALLERGY_CATEGORY], [ALLERGY, SENSITIVITY])
    expect(groups.map((group) => group.title)).toEqual(['Alergias', 'Sensibilidades'])
    expect(groups[1].precautions).toEqual([SENSITIVITY])
  })

  it('una categoría nueva usa su propio nombre y el ícono genérico', () => {
    const [group] = groupPrecautions([{ id: 'category-new', name: 'Medicamento' }], [])
    expect(group.title).toBe('Medicamento')
    expect(group.icon).toBe(DEFAULT_PRECAUTION_ICON)
  })
})
