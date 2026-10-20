import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import { storageFailed } from '../../domain/errors'
import { selectTechnique } from '../select-technique'
import { createFakeCatalogPort, createFakeClientHistoryPort } from './fakes'
import type { SelectableTechnique } from '../../domain/technique-selection'

const technique = (overrides: Partial<SelectableTechnique> = {}): SelectableTechnique => ({
  id: 't1',
  isActive: true,
  durationFirstTimeMin: 90,
  durationRetouchMin: 60,
  bufferMin: 15,
  ...overrides,
})

describe('selectTechnique (use case)', () => {
  it('sin historial: se trata como primera vez (criterio 2)', async () => {
    const catalog = createFakeCatalogPort(new Map([['t1', technique()]]))
    const history = createFakeClientHistoryPort()

    const result = await selectTechnique(catalog, history)({ techniqueId: 't1' })

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.isFirstTime).toBe(true)
    expect(history.calls).toEqual(['t1'])
  })

  it('con historial de cita completada: se trata como re-aplicación', async () => {
    const catalog = createFakeCatalogPort(new Map([['t1', technique()]]))
    const history = createFakeClientHistoryPort(new Set(['t1']))

    const result = await selectTechnique(catalog, history)({ techniqueId: 't1' })

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.isFirstTime).toBe(false)
  })

  it('la corrección manual gana sobre la detección automática', async () => {
    const catalog = createFakeCatalogPort(new Map([['t1', technique()]]))
    const history = createFakeClientHistoryPort(new Set(['t1']))

    const result = await selectTechnique(catalog, history)({
      techniqueId: 't1',
      isFirstTimeOverride: true,
    })

    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value.isFirstTime).toBe(true)
    expect(history.calls).toEqual([])
  })

  it('propaga TechniqueNotAvailable cuando el catálogo no resuelve la técnica', async () => {
    const catalog = createFakeCatalogPort(new Map())
    const history = createFakeClientHistoryPort()

    const result = await selectTechnique(catalog, history)({ techniqueId: 'ghost' })

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe('SCHEDULING_TECHNIQUE_NOT_AVAILABLE')
  })

  it('si no se puede leer el historial, devuelve el error en vez de suponer primera vez', async () => {
    const catalog = createFakeCatalogPort(new Map([['t1', technique()]]))
    const history = createFakeClientHistoryPort(new Set(), storageFailed('sin conexión'))

    const result = await selectTechnique(catalog, history)({ techniqueId: 't1' })

    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})
