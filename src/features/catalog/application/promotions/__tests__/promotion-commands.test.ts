import { describe, it, expect } from 'vitest'
import { isErr, isOk } from '@/shared/result'
import {
  createPromotion,
  updatePromotion,
  deactivatePromotion,
} from '@/features/catalog/application/promotions/commands'
import {
  isPromotionNotFound,
  isPromotionValidationError,
} from '@/features/catalog/domain/promotions/errors'
import type { PromotionWriteModel } from '@/features/catalog/application/promotions/ports'
import { FakeTechniqueRepository } from '../../techniques/__tests__/fake-repository'
import { makeTechnique } from '../../techniques/__tests__/technique-fixture'
import { createFakePackageRepository } from '../../packages/__tests__/fake-package-repository'
import { makePackage } from '../../packages/__tests__/package-fixture'
import { createFakePromotionRepository } from './fake-promotion-repository'
import { makePromotion } from './promotion-fixture'

const validModel = (
  overrides: Partial<PromotionWriteModel> = {},
): PromotionWriteModel => ({
  target: { type: 'technique', techniqueId: 't1' },
  discountPercent: 20,
  startsAt: new Date('2026-01-01T00:00:00Z'),
  endsAt: new Date('2026-01-31T00:00:00Z'),
  ...overrides,
})

const deps = (
  promotionRepo: ReturnType<typeof createFakePromotionRepository>,
  techniqueRepo: FakeTechniqueRepository,
  packageRepo: ReturnType<typeof createFakePackageRepository>,
  id = 'nuevo-id',
) => ({ promotionRepo, techniqueRepo, packageRepo, newId: () => id })

describe('createPromotion', () => {
  it('crea y persiste una promoción sobre una técnica existente y activa (criterio 1)', async () => {
    const techniqueRepo = new FakeTechniqueRepository([makeTechnique({ id: 't1', isActive: true })])
    const packageRepo = createFakePackageRepository()
    const promotionRepo = createFakePromotionRepository()

    const result = await createPromotion(deps(promotionRepo, techniqueRepo, packageRepo, 'p1'))(
      validModel(),
    )
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.id).toBe('p1')
    expect(result.value.discountPercent).toBe(20)
    expect(promotionRepo.saveCalls).toBe(1)
  })

  it('crea y persiste una promoción sobre un paquete existente y activo', async () => {
    const techniqueRepo = new FakeTechniqueRepository()
    const packageRepo = createFakePackageRepository([makePackage({ id: 'pk1', isActive: true })])
    const promotionRepo = createFakePromotionRepository()

    const result = await createPromotion(deps(promotionRepo, techniqueRepo, packageRepo))(
      validModel({ target: { type: 'package', packageId: 'pk1' } }),
    )
    expect(isOk(result)).toBe(true)
    expect(promotionRepo.saveCalls).toBe(1)
  })

  it('rechaza y no persiste si la técnica no existe', async () => {
    const techniqueRepo = new FakeTechniqueRepository()
    const packageRepo = createFakePackageRepository()
    const promotionRepo = createFakePromotionRepository()

    const result = await createPromotion(deps(promotionRepo, techniqueRepo, packageRepo))(
      validModel(),
    )
    expect(isErr(result)).toBe(true)
    if (isErr(result)) {
      expect(isPromotionValidationError(result.error)).toBe(true)
      expect(result.error.problems.join(' ')).toMatch(/no existe la técnica/i)
    }
    expect(promotionRepo.saveCalls).toBe(0)
  })

  it('rechaza y no persiste si la técnica está inactiva', async () => {
    const techniqueRepo = new FakeTechniqueRepository([makeTechnique({ id: 't1', isActive: false })])
    const packageRepo = createFakePackageRepository()
    const promotionRepo = createFakePromotionRepository()

    const result = await createPromotion(deps(promotionRepo, techniqueRepo, packageRepo))(
      validModel(),
    )
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.problems.join(' ')).toMatch(/no está activa/i)
    expect(promotionRepo.saveCalls).toBe(0)
  })

  it('rechaza y no persiste si el paquete no existe o está inactivo', async () => {
    const techniqueRepo = new FakeTechniqueRepository()
    const packageRepo = createFakePackageRepository([makePackage({ id: 'pk1', isActive: false })])
    const promotionRepo = createFakePromotionRepository()

    const result = await createPromotion(deps(promotionRepo, techniqueRepo, packageRepo))(
      validModel({ target: { type: 'package', packageId: 'pk1' } }),
    )
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(result.error.problems.join(' ')).toMatch(/no está activo/i)
    expect(promotionRepo.saveCalls).toBe(0)
  })

  it('rechaza descuento inválido (delegado a buildPromotion)', async () => {
    const techniqueRepo = new FakeTechniqueRepository([makeTechnique({ id: 't1', isActive: true })])
    const packageRepo = createFakePackageRepository()
    const promotionRepo = createFakePromotionRepository()

    const result = await createPromotion(deps(promotionRepo, techniqueRepo, packageRepo))(
      validModel({ discountPercent: 0 }),
    )
    expect(isErr(result)).toBe(true)
    expect(promotionRepo.saveCalls).toBe(0)
  })
})

describe('updatePromotion', () => {
  it('actualiza una promoción existente conservando su estado activo', async () => {
    const techniqueRepo = new FakeTechniqueRepository([makeTechnique({ id: 't1', isActive: true })])
    const packageRepo = createFakePackageRepository()
    const promotionRepo = createFakePromotionRepository([
      makePromotion({ id: 'e1', discountPercent: 10, isActive: true }),
    ])

    const result = await updatePromotion(deps(promotionRepo, techniqueRepo, packageRepo))(
      'e1',
      validModel({ discountPercent: 30 }),
    )
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.discountPercent).toBe(30)
    expect(result.value.isActive).toBe(true)
  })

  it('preserva isActive=false al actualizar una promoción pausada', async () => {
    const techniqueRepo = new FakeTechniqueRepository([makeTechnique({ id: 't1', isActive: true })])
    const packageRepo = createFakePackageRepository()
    const promotionRepo = createFakePromotionRepository([makePromotion({ id: 'e2', isActive: false })])

    const result = await updatePromotion(deps(promotionRepo, techniqueRepo, packageRepo))(
      'e2',
      validModel(),
    )
    if (!isOk(result)) throw new Error('esperaba ok')
    expect(result.value.isActive).toBe(false)
  })

  it('devuelve PromotionNotFound si no existe', async () => {
    const techniqueRepo = new FakeTechniqueRepository([makeTechnique({ id: 't1', isActive: true })])
    const packageRepo = createFakePackageRepository()
    const promotionRepo = createFakePromotionRepository()

    const result = await updatePromotion(deps(promotionRepo, techniqueRepo, packageRepo))(
      'nope',
      validModel(),
    )
    expect(isErr(result)).toBe(true)
    if (isErr(result)) expect(isPromotionNotFound(result.error)).toBe(true)
  })
})

describe('deactivatePromotion', () => {
  it('desactiva una promoción existente', async () => {
    const techniqueRepo = new FakeTechniqueRepository()
    const packageRepo = createFakePackageRepository()
    const promotionRepo = createFakePromotionRepository([makePromotion({ id: 'd1', isActive: true })])

    const result = await deactivatePromotion(deps(promotionRepo, techniqueRepo, packageRepo))('d1')
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    expect(result.value.isActive).toBe(false)
    expect((await promotionRepo.findById('d1'))?.isActive).toBe(false)
  })

  it('devuelve PromotionNotFound si no existe', async () => {
    const techniqueRepo = new FakeTechniqueRepository()
    const packageRepo = createFakePackageRepository()
    const promotionRepo = createFakePromotionRepository()

    const result = await deactivatePromotion(deps(promotionRepo, techniqueRepo, packageRepo))('nope')
    expect(isErr(result)).toBe(true)
  })
})
