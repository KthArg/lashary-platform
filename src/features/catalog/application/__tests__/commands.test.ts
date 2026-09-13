import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import {
  createTechnique,
  updateTechnique,
  deactivateTechnique,
} from '@/features/catalog/application/commands'
import {
  TechniqueNotFound,
  TechniqueValidationError,
} from '@/features/catalog/domain/errors'
import type { TechniqueWriteModel } from '@/features/catalog/application/ports'
import { FakeTechniqueRepository } from './fake-repository'
import { makeTechnique } from './technique-fixture'

const validModel = (): TechniqueWriteModel => ({
  name: 'Set volumen',
  family: 'lash_volume',
  priceFirstTime: 32000,
  priceRetouch: 19000,
  durationFirstTimeMin: 150,
  durationRetouchMin: 90,
  bufferMin: 15,
  reapplicationIntervalDays: 21,
  deposit: 12000,
  aftercareText: 'Cuidados posteriores.',
})

const deps = (repo: FakeTechniqueRepository, id = 'nuevo-id') => ({
  repo,
  newId: () => id,
})

describe('createTechnique', () => {
  it('crea y persiste una técnica válida', async () => {
    const repo = new FakeTechniqueRepository()
    const result = await createTechnique(deps(repo, 'abc'))(validModel())
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.id).toBe('abc')
    expect(result.value.priceFirstTime).toBe(32000)
    expect(repo.saveCalls).toBe(1)
    expect(await repo.findById('abc')).not.toBeNull()
  })

  it('rechaza y no persiste una técnica inválida (D10)', async () => {
    const repo = new FakeTechniqueRepository()
    const result = await createTechnique(deps(repo))({
      ...validModel(),
      priceRetouch: 19000,
      durationRetouchMin: null,
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error).toBeInstanceOf(TechniqueValidationError)
    expect(repo.saveCalls).toBe(0)
  })

  it('rechaza montos no enteros', async () => {
    const repo = new FakeTechniqueRepository()
    const result = await createTechnique(deps(repo))({
      ...validModel(),
      priceFirstTime: 32000.5,
    })
    expect(isErr(result)).toBe(true)
    expect(repo.saveCalls).toBe(0)
  })
})

describe('updateTechnique', () => {
  it('actualiza una técnica existente conservando su estado activo', async () => {
    const repo = new FakeTechniqueRepository([
      makeTechnique({ id: 'e1', isActive: true }),
    ])
    const result = await updateTechnique(deps(repo))('e1', {
      ...validModel(),
      name: 'Renombrada',
    })
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.name).toBe('Renombrada')
    expect(result.value.isActive).toBe(true)
    expect(result.value.id).toBe('e1')
  })

  it('preserva isActive=false al actualizar una técnica desactivada', async () => {
    const repo = new FakeTechniqueRepository([
      makeTechnique({ id: 'e2', isActive: false }),
    ])
    const result = await updateTechnique(deps(repo))('e2', validModel())
    if (!isOk(result)) throw new Error('esperaba ok')
    expect(result.value.isActive).toBe(false)
  })

  it('devuelve TechniqueNotFound si no existe', async () => {
    const repo = new FakeTechniqueRepository()
    const result = await updateTechnique(deps(repo))('nope', validModel())
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error).toBeInstanceOf(TechniqueNotFound)
  })

  it('rechaza cambios inválidos sin persistir', async () => {
    const repo = new FakeTechniqueRepository([makeTechnique({ id: 'e3' })])
    const before = repo.saveCalls
    const result = await updateTechnique(deps(repo))('e3', {
      ...validModel(),
      name: '   ',
    })
    expect(isErr(result)).toBe(true)
    expect(repo.saveCalls).toBe(before)
  })
})

describe('deactivateTechnique', () => {
  it('desactiva una técnica existente', async () => {
    const repo = new FakeTechniqueRepository([
      makeTechnique({ id: 'd1', isActive: true }),
    ])
    const result = await deactivateTechnique(deps(repo))('d1')
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.isActive).toBe(false)
    expect((await repo.findById('d1'))?.isActive).toBe(false)
  })

  it('devuelve TechniqueNotFound si no existe', async () => {
    const repo = new FakeTechniqueRepository()
    const result = await deactivateTechnique(deps(repo))('nope')
    expect(isErr(result)).toBe(true)
  })
})
