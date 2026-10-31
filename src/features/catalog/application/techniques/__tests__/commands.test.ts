import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import {
  createTechnique,
  updateTechnique,
  findPackagesAffectedByDeactivation,
  deactivateTechniqueCascade,
} from '@/features/catalog/application/techniques/commands'
import {
  isTechniqueAffectedPackagesChanged,
  isTechniqueNameConflict,
  isTechniqueNotFound,
  isTechniqueValidationError,
} from '@/features/catalog/domain/techniques/errors'
import type { TechniqueWriteModel } from '@/features/catalog/application/techniques/ports'
import { createFakePackageRepository } from '@/features/catalog/application/packages/__tests__/fake-package-repository'
import { makePackage } from '@/features/catalog/application/packages/__tests__/package-fixture'
import { createFakeTechniqueRepository, type FakeTechniqueRepository } from './fake-repository'
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
    const repo = createFakeTechniqueRepository()
    const result = await createTechnique(deps(repo, 'abc'))(validModel())
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.id).toBe('abc')
    expect(result.value.priceFirstTime).toBe(32000)
    expect(repo.saveCalls).toBe(1)
    expect(await repo.findById('abc')).not.toBeNull()
  })

  it('rechaza y no persiste una técnica inválida (D10)', async () => {
    const repo = createFakeTechniqueRepository()
    const result = await createTechnique(deps(repo))({
      ...validModel(),
      priceRetouch: 19000,
      durationRetouchMin: null,
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(isTechniqueValidationError(result.error)).toBe(true)
    expect(repo.saveCalls).toBe(0)
  })

  it('rechaza montos no enteros', async () => {
    const repo = createFakeTechniqueRepository()
    const result = await createTechnique(deps(repo))({
      ...validModel(),
      priceFirstTime: 32000.5,
    })
    expect(isErr(result)).toBe(true)
    expect(repo.saveCalls).toBe(0)
  })

  it('DOM-006: devuelve TechniqueNameConflict si el nombre ya existe, no un Error genérico', async () => {
    const repo = createFakeTechniqueRepository([
      makeTechnique({ id: 'existente', name: 'Set clásico' }),
    ])
    const result = await createTechnique(deps(repo, 'nuevo'))({
      ...validModel(),
      name: 'Set clásico',
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(isTechniqueNameConflict(result.error)).toBe(true)
    expect(repo.saveCalls).toBe(0)
  })
})

describe('updateTechnique', () => {
  it('actualiza una técnica existente conservando su estado activo', async () => {
    const repo = createFakeTechniqueRepository([
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
    const repo = createFakeTechniqueRepository([
      makeTechnique({ id: 'e2', isActive: false }),
    ])
    const result = await updateTechnique(deps(repo))('e2', validModel())
    if (!isOk(result)) throw new Error('esperaba ok')
    expect(result.value.isActive).toBe(false)
  })

  it('devuelve TechniqueNotFound si no existe', async () => {
    const repo = createFakeTechniqueRepository()
    const result = await updateTechnique(deps(repo))('nope', validModel())
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(isTechniqueNotFound(result.error)).toBe(true)
  })

  it('rechaza cambios inválidos sin persistir', async () => {
    const repo = createFakeTechniqueRepository([makeTechnique({ id: 'e3' })])
    const before = repo.saveCalls
    const result = await updateTechnique(deps(repo))('e3', {
      ...validModel(),
      name: '   ',
    })
    expect(isErr(result)).toBe(true)
    expect(repo.saveCalls).toBe(before)
  })

  it('DOM-006: renombrar a un nombre ya usado por otra técnica devuelve TechniqueNameConflict', async () => {
    const repo = createFakeTechniqueRepository([
      makeTechnique({ id: 'e4', name: 'Set clásico' }),
      makeTechnique({ id: 'e5', name: 'Laminado de cejas' }),
    ])
    const result = await updateTechnique(deps(repo))('e5', {
      ...validModel(),
      name: 'Set clásico',
    })
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(isTechniqueNameConflict(result.error)).toBe(true)
  })
})

describe('findPackagesAffectedByDeactivation', () => {
  it('sin paquetes que la incluyan, la lista llega vacía', async () => {
    const repo = createFakeTechniqueRepository([makeTechnique({ id: 'd1', isActive: true })])
    const packageRepo = createFakePackageRepository()
    const result = await findPackagesAffectedByDeactivation({ repo, packageRepo })('d1')
    expect(isOk(result) && result.value).toEqual([])
  })

  it('nombra cada paquete activo que incluye la técnica, sin los inactivos', async () => {
    const repo = createFakeTechniqueRepository([makeTechnique({ id: 'd1', isActive: true })])
    const packageRepo = createFakePackageRepository([
      makePackage({ id: 'p1', name: 'Combo clásicas', techniqueIds: ['d1', 'd2'], isActive: true }),
      makePackage({ id: 'p2', name: 'Combo ya desactivado', techniqueIds: ['d1', 'd3'], isActive: false }),
    ])
    const result = await findPackagesAffectedByDeactivation({ repo, packageRepo })('d1')
    expect(isOk(result) && result.value).toEqual([{ id: 'p1', name: 'Combo clásicas' }])
  })

  it('devuelve TechniqueNotFound si la técnica no existe', async () => {
    const repo = createFakeTechniqueRepository()
    const packageRepo = createFakePackageRepository()
    const result = await findPackagesAffectedByDeactivation({ repo, packageRepo })('nope')
    expect(isErr(result) && isTechniqueNotFound(result.error)).toBe(true)
  })
})

describe('deactivateTechniqueCascade', () => {
  it('sin paquetes confirmados, desactiva solo la técnica', async () => {
    const repo = createFakeTechniqueRepository([makeTechnique({ id: 'd1', isActive: true })])
    const packageRepo = createFakePackageRepository()
    const result = await deactivateTechniqueCascade({ repo, packageRepo })('d1', [])
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.technique.isActive).toBe(false)
    expect(result.value.deactivatedPackages).toEqual([])
  })

  it('con paquetes confirmados, desactiva la técnica y esos paquetes', async () => {
    const repo = createFakeTechniqueRepository(
      [makeTechnique({ id: 'd1', isActive: true })],
      { d1: ['p1'] },
    )
    const packageRepo = createFakePackageRepository()
    const confirmed = [{ id: 'p1', name: 'Combo clásicas' }]
    const result = await deactivateTechniqueCascade({ repo, packageRepo })('d1', confirmed)
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.technique.isActive).toBe(false)
    expect(result.value.deactivatedPackages).toEqual(confirmed)
  })

  it('si la lista de paquetes afectados cambió, no toca nada y devuelve la lista fresca', async () => {
    const repo = createFakeTechniqueRepository(
      [makeTechnique({ id: 'd1', isActive: true })],
      { d1: ['p1', 'p2'] },
    )
    const packageRepo = createFakePackageRepository([
      makePackage({ id: 'p1', name: 'Combo clásicas', techniqueIds: ['d1', 'd2'], isActive: true }),
      makePackage({ id: 'p2', name: 'Combo volumen', techniqueIds: ['d1', 'd3'], isActive: true }),
    ])
    const stale = [{ id: 'p1', name: 'Combo clásicas' }]
    const result = await deactivateTechniqueCascade({ repo, packageRepo })('d1', stale)
    expect(isErr(result) && isTechniqueAffectedPackagesChanged(result.error)).toBe(true)
    if (isErr(result) && isTechniqueAffectedPackagesChanged(result.error)) {
      expect(result.error.affectedPackages).toEqual([
        { id: 'p1', name: 'Combo clásicas' },
        { id: 'p2', name: 'Combo volumen' },
      ])
    }
    expect((await repo.findById('d1'))?.isActive).toBe(true)
  })

  it('devuelve TechniqueNotFound si la técnica no existe', async () => {
    const repo = createFakeTechniqueRepository()
    const packageRepo = createFakePackageRepository()
    const result = await deactivateTechniqueCascade({ repo, packageRepo })('nope', [])
    expect(isErr(result) && isTechniqueNotFound(result.error)).toBe(true)
  })
})
