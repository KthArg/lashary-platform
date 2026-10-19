import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { buildRecordContent } from '../record-content'
import { RECORD_LIMITS } from '../record-limits'
import { isRecordValidationError } from '../record-errors'
import { ALLERGY, SENSITIVITY, validContentInput } from './record-fixtures'
import type { RecordContentInput } from '../record.types'

function problemsOf(input: RecordContentInput) {
  const result = buildRecordContent(input)
  if (!isErr(result)) return []
  return result.error.problems
}

describe('buildRecordContent — el contenido del expediente (criterios 1 y 2)', () => {
  it('arma un contenido con estudio, técnica recomendada y antecedentes', () => {
    const result = buildRecordContent(validContentInput())
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.studyText).toBe('Pestaña natural fina y corta')
    expect(result.value.recommendedTechnique).toEqual({ id: 'technique-classic', name: 'Clásicas' })
    expect(result.value.precautions).toEqual([ALLERGY])
  })

  it('acepta un estudio sin técnica recomendada', () => {
    const result = buildRecordContent({ ...validContentInput(), recommendedTechnique: null })
    expect(isOk(result)).toBe(true)
  })

  it('recorta los espacios del estudio, de la técnica y de cada antecedente', () => {
    const result = buildRecordContent({
      studyText: '  Pestaña fina  ',
      recommendedTechnique: { id: 'technique-classic', name: ' Clásicas ' },
      precautions: [{ ...ALLERGY, categoryName: ' Alergia ', description: '  Látex ' }],
      images: [' cliente-1/foto.jpg '],
    })
    if (!isOk(result)) throw new Error('debería ser válida')
    expect(result.value.studyText).toBe('Pestaña fina')
    expect(result.value.recommendedTechnique?.name).toBe('Clásicas')
    expect(result.value.precautions[0].categoryName).toBe('Alergia')
    expect(result.value.precautions[0].description).toBe('Látex')
    expect(result.value.images).toEqual(['cliente-1/foto.jpg'])
  })

  it('rechaza un estudio vacío o de solo espacios', () => {
    expect(problemsOf({ ...validContentInput(), studyText: '   ' })).toEqual(['study-text-empty'])
  })

  it('rechaza un estudio más largo que el límite', () => {
    const studyText = 'a'.repeat(RECORD_LIMITS.studyTextMaxLength + 1)
    expect(problemsOf({ ...validContentInput(), studyText })).toEqual(['study-text-too-long'])
  })

  it('acepta un estudio justo en el límite', () => {
    const studyText = 'a'.repeat(RECORD_LIMITS.studyTextMaxLength)
    expect(isOk(buildRecordContent({ ...validContentInput(), studyText }))).toBe(true)
  })

  it('rechaza una técnica recomendada sin nombre', () => {
    const recommendedTechnique = { id: 'technique-classic', name: ' ' }
    expect(problemsOf({ ...validContentInput(), recommendedTechnique })).toEqual(['technique-name-empty'])
  })

  it('rechaza un antecedente sin descripción o sin categoría', () => {
    const precautions = [{ ...ALLERGY, description: ' ' }, { ...SENSITIVITY, categoryName: '' }]
    expect(problemsOf({ ...validContentInput(), precautions })).toEqual([
      'precaution-category-empty',
      'precaution-description-empty',
    ])
  })

  it('rechaza una descripción de antecedente más larga que el límite', () => {
    const description = 'a'.repeat(RECORD_LIMITS.precautionDescriptionMaxLength + 1)
    const precautions = [{ ...ALLERGY, description }]
    expect(problemsOf({ ...validContentInput(), precautions })).toEqual(['precaution-description-too-long'])
  })

  it('rechaza el mismo antecedente dos veces aunque cambien las mayúsculas', () => {
    const repeated = { ...ALLERGY, id: 'precaution-9', description: 'CIANOACRILATO ESTÁNDAR' }
    const precautions = [ALLERGY, repeated]
    expect(problemsOf({ ...validContentInput(), precautions })).toEqual(['duplicate-precaution'])
  })

  it('rechaza dos antecedentes con el mismo id', () => {
    const precautions = [ALLERGY, { ...SENSITIVITY, id: ALLERGY.id }]
    expect(problemsOf({ ...validContentInput(), precautions })).toEqual(['duplicate-precaution'])
  })

  it('acepta la misma descripción en categorías distintas', () => {
    const precautions = [ALLERGY, { ...SENSITIVITY, description: ALLERGY.description }]
    expect(isOk(buildRecordContent({ ...validContentInput(), precautions }))).toBe(true)
  })

  it('rechaza más antecedentes que el límite', () => {
    const precautions = Array.from({ length: RECORD_LIMITS.maxPrecautions + 1 }, (_, index) => ({
      ...ALLERGY,
      id: `precaution-${index}`,
      description: `Antecedente ${index}`,
    }))
    expect(problemsOf({ ...validContentInput(), precautions })).toEqual(['too-many-precautions'])
  })

  it('rechaza imágenes vacías, repetidas o de más', () => {
    expect(problemsOf({ ...validContentInput(), images: [''] })).toEqual(['image-path-empty'])
    expect(problemsOf({ ...validContentInput(), images: ['a.jpg', 'a.jpg'] })).toEqual(['duplicate-image'])
    const images = Array.from({ length: RECORD_LIMITS.maxImages + 1 }, (_, index) => `foto-${index}.jpg`)
    expect(problemsOf({ ...validContentInput(), images })).toEqual(['too-many-images'])
  })

  it('junta todos los problemas en un solo error de validación', () => {
    const result = buildRecordContent({ ...validContentInput(), studyText: '', images: [''] })
    if (!isErr(result)) throw new Error('debería fallar')
    expect(isRecordValidationError(result.error)).toBe(true)
    expect(result.error.problems).toEqual(['study-text-empty', 'image-path-empty'])
  })
})
