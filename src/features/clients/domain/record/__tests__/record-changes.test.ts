import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { addImage, addPrecaution, createInitialRecord, editStudy, removePrecaution } from '../record-changes'
import { isPrecautionNotFound, isRecordUnchanged, isRecordValidationError } from '../record-errors'
import { ALLERGY, SENSITIVITY, validContent, validContentInput } from './record-fixtures'

describe('cambios del expediente — cada cambio es un contenido nuevo (criterio 4)', () => {
  it('el registro inicial produce un contenido marcado como inicial', () => {
    const result = createInitialRecord(validContentInput())
    if (!isOk(result)) throw new Error('debería ser válido')
    expect(result.value.changeKind).toBe('initial')
    expect(result.value.content.studyText).toBe('Pestaña natural fina y corta')
  })

  it('el registro inicial inválido no produce contenido', () => {
    const result = createInitialRecord({ ...validContentInput(), studyText: '' })
    expect(isErr(result) && isRecordValidationError(result.error)).toBe(true)
  })

  it('agregar un antecedente lo suma al final y conserva el resto', () => {
    const current = validContent()
    const result = addPrecaution(current, SENSITIVITY)
    if (!isOk(result)) throw new Error('debería ser válido')
    expect(result.value.changeKind).toBe('precaution_added')
    expect(result.value.content.precautions).toEqual([ALLERGY, SENSITIVITY])
    expect(result.value.content.studyText).toBe(current.studyText)
  })

  it('agregar no modifica el contenido vigente', () => {
    const current = validContent()
    addPrecaution(current, SENSITIVITY)
    expect(current.precautions).toEqual([ALLERGY])
  })

  it('no agrega un antecedente que ya está', () => {
    const result = addPrecaution(validContent(), { ...ALLERGY, id: 'precaution-9' })
    expect(isErr(result) && isRecordValidationError(result.error)).toBe(true)
  })

  it('quitar un antecedente produce un contenido sin él y el anterior lo conserva', () => {
    const current = validContent({ ...validContentInput(), precautions: [ALLERGY, SENSITIVITY] })
    const result = removePrecaution(current, ALLERGY.id)
    if (!isOk(result)) throw new Error('debería ser válido')
    expect(result.value.changeKind).toBe('precaution_removed')
    expect(result.value.content.precautions).toEqual([SENSITIVITY])
    expect(current.precautions).toEqual([ALLERGY, SENSITIVITY])
  })

  it('quitar un antecedente que no existe devuelve no encontrado', () => {
    const result = removePrecaution(validContent(), 'precaution-inexistente')
    if (!isErr(result)) throw new Error('debería fallar')
    expect(isPrecautionNotFound(result.error)).toBe(true)
  })

  it('editar el estudio cambia texto y técnica y conserva los antecedentes', () => {
    const result = editStudy(validContent(), {
      studyText: 'Pestaña fina, corta y escasa',
      recommendedTechnique: { id: 'technique-volume', name: 'Volumen' },
    })
    if (!isOk(result)) throw new Error('debería ser válido')
    expect(result.value.changeKind).toBe('study_edited')
    expect(result.value.content.recommendedTechnique?.name).toBe('Volumen')
    expect(result.value.content.precautions).toEqual([ALLERGY])
  })

  it('editar el estudio puede quitar la técnica recomendada', () => {
    const result = editStudy(validContent(), { studyText: 'Pestaña natural fina y corta', recommendedTechnique: null })
    if (!isOk(result)) throw new Error('debería ser válido')
    expect(result.value.content.recommendedTechnique).toBeNull()
  })

  it('editar sin cambiar nada no produce una versión vacía', () => {
    const current = validContent()
    const result = editStudy(current, {
      studyText: `  ${current.studyText}  `,
      recommendedTechnique: current.recommendedTechnique,
    })
    if (!isErr(result)) throw new Error('debería fallar')
    expect(isRecordUnchanged(result.error)).toBe(true)
  })

  it('agregar una imagen la suma al contenido', () => {
    const result = addImage(validContent(), 'cliente-1/estudio.jpg')
    if (!isOk(result)) throw new Error('debería ser válido')
    expect(result.value.changeKind).toBe('image_added')
    expect(result.value.content.images).toEqual(['cliente-1/estudio.jpg'])
  })

  it('no agrega la misma imagen dos veces', () => {
    const current = validContent({ ...validContentInput(), images: ['cliente-1/estudio.jpg'] })
    const result = addImage(current, 'cliente-1/estudio.jpg')
    expect(isErr(result) && isRecordValidationError(result.error)).toBe(true)
  })
})
