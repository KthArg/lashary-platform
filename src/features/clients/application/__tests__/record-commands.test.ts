import { describe, it, expect } from 'vitest'
import { isOk } from '@/shared/result'
import { fixedDate } from '@/shared/testing/fixed-clock'
import {
  addRecordPrecaution,
  createRecord,
  editRecordStudy,
  removeRecordPrecaution,
} from '../record/record-commands'
import { ALLERGY } from '../../domain/record/__tests__/record-fixtures'
import { ACTOR, SAVED_AT, commandDeps, initialVersion } from './record-fakes'

const codeOf = (result: { ok: boolean; error?: { code: string } }) => (result.ok ? null : result.error?.code)

describe('createRecord — registro inicial (criterio 1)', () => {
  it('guarda la versión inicial con su autora y fecha, y lo registra en la bitácora', async () => {
    const { deps, versions, events } = commandDeps()
    const result = await createRecord(deps)(ACTOR, { studyText: 'Pestaña fina', recommendedTechniqueId: 'technique-volume' })
    if (!isOk(result)) throw new Error('debería guardar')
    expect(versions).toHaveLength(1)
    expect(result.value).toMatchObject({ previousVersionId: null, changeKind: 'initial', createdBy: ACTOR.actorId })
    expect(result.value.createdAt).toEqual(fixedDate(SAVED_AT))
    expect(result.value.content.recommendedTechnique).toEqual({ id: 'technique-volume', name: 'Volumen' })
    expect(events).toEqual([{ ...ACTOR, action: 'clients.record.updated' }])
  })

  it('no crea un segundo registro inicial', async () => {
    const { deps } = commandDeps([initialVersion()])
    const result = await createRecord(deps)(ACTOR, { studyText: 'Otro', recommendedTechniqueId: null })
    expect(codeOf(result)).toBe('record-exists')
  })

  it('rechaza una técnica que no está activa en el catálogo', async () => {
    const { deps, versions } = commandDeps()
    const result = await createRecord(deps)(ACTOR, { studyText: 'Pestaña fina', recommendedTechniqueId: 'technique-old' })
    expect(codeOf(result)).toBe('technique-not-found')
    expect(versions).toHaveLength(0)
  })

  it('devuelve el error de validación del dominio sin guardar nada', async () => {
    const { deps, versions } = commandDeps()
    const result = await createRecord(deps)(ACTOR, { studyText: '  ', recommendedTechniqueId: null })
    expect(codeOf(result)).toBe('CLIENTS_RECORD_INVALID')
    expect(versions).toHaveLength(0)
  })
})

describe('cambios sobre el expediente — cada uno es una versión nueva (criterios 2 y 4)', () => {
  it('agregar un antecedente copia el nombre de la categoría y encadena la versión anterior', async () => {
    const { deps, versions } = commandDeps([initialVersion()])
    const result = await addRecordPrecaution(deps)(ACTOR, { categoryId: 'category-condition', description: 'Blefaritis' })
    if (!isOk(result)) throw new Error('debería guardar')
    expect(result.value.previousVersionId).toBe('version-1')
    expect(result.value.changeKind).toBe('precaution_added')
    expect(result.value.content.precautions[1]).toMatchObject({ categoryName: 'Condición relevante', description: 'Blefaritis' })
    expect(versions).toHaveLength(2)
  })

  it('rechaza una categoría que no existe', async () => {
    const { deps } = commandDeps([initialVersion()])
    const result = await addRecordPrecaution(deps)(ACTOR, { categoryId: 'category-x', description: 'Algo' })
    expect(codeOf(result)).toBe('category-not-found')
  })

  it('no actualiza el expediente de una clienta que no tiene registro inicial', async () => {
    const { deps } = commandDeps()
    const result = await removeRecordPrecaution(deps)(ACTOR, ALLERGY.id)
    expect(codeOf(result)).toBe('record-missing')
  })

  it('quitar un antecedente guarda una versión sin él', async () => {
    const { deps } = commandDeps([initialVersion()])
    const result = await removeRecordPrecaution(deps)(ACTOR, ALLERGY.id)
    if (!isOk(result)) throw new Error('debería guardar')
    expect(result.value.content.precautions).toEqual([])
  })

  it('editar el texto conserva la técnica vigente aunque ya no esté activa en el catálogo', async () => {
    const { deps } = commandDeps([initialVersion()])
    const result = await editRecordStudy(deps)(ACTOR, { studyText: 'Pestaña escasa', recommendedTechniqueId: 'technique-classic' })
    if (!isOk(result)) throw new Error('debería guardar')
    expect(result.value.content.recommendedTechnique).toEqual({ id: 'technique-classic', name: 'Clásicas' })
  })

  it('editar sin cambios no guarda una versión', async () => {
    const { deps, versions } = commandDeps([initialVersion()])
    const current = initialVersion().content
    const result = await editRecordStudy(deps)(ACTOR, { studyText: current.studyText, recommendedTechniqueId: 'technique-classic' })
    expect(codeOf(result)).toBe('CLIENTS_RECORD_UNCHANGED')
    expect(versions).toHaveLength(1)
  })

  it('dos cambios simultáneos sobre la misma versión: uno se guarda y el otro choca', async () => {
    const { deps, versions } = commandDeps([initialVersion()])
    const add = addRecordPrecaution(deps)
    const results = await Promise.all([
      add(ACTOR, { categoryId: 'category-condition', description: 'Blefaritis' }),
      add(ACTOR, { categoryId: 'category-condition', description: 'Ojo seco' }),
    ])
    expect(results.filter(isOk)).toHaveLength(1)
    expect(results.map(codeOf)).toContain('version-conflict')
    expect(versions).toHaveLength(2)
  })

  it('si la bitácora falla después de guardar, lo dice con su propio código y la versión queda guardada', async () => {
    const { deps, versions } = commandDeps([initialVersion()], false)
    const result = await removeRecordPrecaution(deps)(ACTOR, ALLERGY.id)
    expect(codeOf(result)).toBe('saved-without-audit')
    expect(versions).toHaveLength(2)
  })
})
