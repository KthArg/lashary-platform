import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeTechnique } from '@/features/catalog/application/techniques/__tests__/technique-fixture'

const mocks = vi.hoisted(() => ({
  isStaff: vi.fn(),
  promotionSave: vi.fn(),
  promotionFindById: vi.fn(),
  techniqueFindById: vi.fn(),
  packageFindById: vi.fn(),
}))

vi.mock('@/features/catalog/ui/require-staff', () => ({
  isStaff: mocks.isStaff,
}))
vi.mock('@/features/catalog/db/promotions/promotion-repository', () => ({
  promotionRepository: vi.fn(async () => ({
    save: mocks.promotionSave,
    findById: mocks.promotionFindById,
  })),
}))
vi.mock('@/features/catalog/db/techniques/technique-repository', () => ({
  techniqueRepository: vi.fn(async () => ({
    findById: mocks.techniqueFindById,
  })),
}))
vi.mock('@/features/catalog/db/packages/package-repository', () => ({
  packageRepository: vi.fn(async () => ({
    findById: mocks.packageFindById,
  })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import {
  createPromotionAction,
  deactivatePromotionAction,
} from '@/features/catalog/ui/promotions/actions/promotion-actions'
import { initialPromotionActionState } from '@/features/catalog/ui/promotions/types/promotion-action-state'

function form(fields: Record<string, string>): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) formData.set(key, value)
  return formData
}

const validFields = {
  targetType: 'technique',
  targetId: 't1',
  discountPercent: '20',
  startsAt: '2026-01-01T10:00',
  endsAt: '2026-01-31T10:00',
}

describe('acciones administrativas de promociones', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isStaff.mockResolvedValue(true)
    mocks.promotionSave.mockResolvedValue(undefined)
    mocks.techniqueFindById.mockResolvedValue(makeTechnique({ id: 't1', isActive: true }))
  })

  it('rechaza una llamada directa sin sesión staff antes de tocar el repositorio', async () => {
    mocks.isStaff.mockResolvedValueOnce(false)

    const state = await createPromotionAction(initialPromotionActionState, form(validFields))

    expect(state.status).toBe('forbidden')
    expect(state.message).toContain('permisos')
    expect(mocks.promotionSave).not.toHaveBeenCalled()
  })

  it('valida el formulario antes de guardar (descuento fuera de rango)', async () => {
    const state = await createPromotionAction(
      initialPromotionActionState,
      form({ ...validFields, discountPercent: '0' }),
    )

    expect(state.status).toBe('invalid')
    expect(state.problems?.length).toBeGreaterThanOrEqual(1)
    expect(mocks.promotionSave).not.toHaveBeenCalled()
  })

  it('permite crear una promoción sobre una técnica activa (criterio 1)', async () => {
    const state = await createPromotionAction(initialPromotionActionState, form(validFields))

    expect(state).toMatchObject({ status: 'ok', message: 'Promoción creada.' })
    expect(mocks.promotionSave).toHaveBeenCalledTimes(1)
  })

  it('rechaza si la técnica no existe o no está activa, sin guardar', async () => {
    mocks.techniqueFindById.mockResolvedValueOnce(null)

    const state = await createPromotionAction(initialPromotionActionState, form(validFields))

    expect(state.status).toBe('invalid')
    expect(mocks.promotionSave).not.toHaveBeenCalled()
  })

  it('rechaza desactivar mediante una llamada directa sin sesión staff', async () => {
    mocks.isStaff.mockResolvedValueOnce(false)

    const state = await deactivatePromotionAction(initialPromotionActionState, form({ id: 'algo' }))

    expect(state.status).toBe('forbidden')
    expect(mocks.promotionFindById).not.toHaveBeenCalled()
  })
})
