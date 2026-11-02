import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ok, err } from '@/shared/result'

const mocks = vi.hoisted(() => ({
  isStaff: vi.fn(),
  save: vi.fn(),
  findById: vi.fn(),
  deactivateCascade: vi.fn(),
  findActiveByTechniqueId: vi.fn(),
}))

vi.mock('@/features/catalog/ui/require-staff', () => ({
  isStaff: mocks.isStaff,
}))
vi.mock('@/features/catalog/db/techniques/technique-repository', () => ({
  techniqueRepository: vi.fn(async () => ({
    save: mocks.save,
    findById: mocks.findById,
    deactivateCascade: mocks.deactivateCascade,
  })),
}))
vi.mock('@/features/catalog/db/packages/package-repository', () => ({
  packageRepository: vi.fn(async () => ({
    findActiveByTechniqueId: mocks.findActiveByTechniqueId,
  })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import {
  createTechniqueAction,
  checkTechniqueDeactivationAction,
  deactivateTechniqueCascadeAction,
} from '@/features/catalog/ui/techniques/actions/technique-actions'
import { initialActionState } from '@/features/catalog/ui/techniques/types/technique-action-state'
import { techniqueNameConflict } from '@/features/catalog/domain/techniques/errors'
import { makeTechnique } from '@/features/catalog/application/techniques/__tests__/technique-fixture'

function form(fields: Record<string, string>): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) formData.set(key, value)
  return formData
}

const validFields = {
  name: 'Set volumen',
  family: 'lash_volume',
  priceFirstTime: '32000',
  priceRetouch: '',
  durationFirstTimeMin: '150',
  durationRetouchMin: '',
  bufferMin: '15',
  reapplicationIntervalDays: '',
  deposit: '12000',
  aftercareText: 'Cuidados.',
}

describe('acciones administrativas del catálogo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isStaff.mockResolvedValue(true)
    mocks.save.mockResolvedValue(ok(undefined))
  })

  it('rechaza una llamada directa sin sesión staff antes de tocar el repositorio', async () => {
    mocks.isStaff.mockResolvedValueOnce(false)

    const state = await createTechniqueAction(
      initialActionState,
      form(validFields),
    )

    expect(state.status).toBe('forbidden')
    expect(state.message).toContain('permisos')
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('valida los datos de una administradora antes de guardar', async () => {
    const state = await createTechniqueAction(
      initialActionState,
      form({ ...validFields, name: '', priceFirstTime: '-1' }),
    )

    expect(state.status).toBe('invalid')
    expect(state.problems?.length).toBeGreaterThanOrEqual(2)
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('permite crear una técnica a una administradora', async () => {
    const state = await createTechniqueAction(
      initialActionState,
      form(validFields),
    )

    expect(state).toMatchObject({ status: 'ok', message: 'Técnica creada.' })
    expect(mocks.save).toHaveBeenCalledTimes(1)
  })

  it('DOM-006: un nombre duplicado vuelve como estado "invalid" con mensaje, no como excepción', async () => {
    mocks.save.mockResolvedValueOnce(err(techniqueNameConflict('Set volumen')))

    const state = await createTechniqueAction(
      initialActionState,
      form(validFields),
    )

    expect(state.status).toBe('invalid')
    expect(state.problems).toEqual(['ya existe una técnica llamada "Set volumen"'])
  })

  it('rechaza comprobar los paquetes afectados sin sesión staff', async () => {
    mocks.isStaff.mockResolvedValueOnce(false)

    const result = await checkTechniqueDeactivationAction('algo')

    expect(result).toEqual({ status: 'forbidden' })
    expect(mocks.findById).not.toHaveBeenCalled()
  })

  it('comprueba qué paquetes activos incluyen la técnica', async () => {
    mocks.findById.mockResolvedValueOnce(makeTechnique({ id: 'd1', isActive: true }))
    mocks.findActiveByTechniqueId.mockResolvedValueOnce([{ id: 'p1', name: 'Combo clásicas' }])

    const result = await checkTechniqueDeactivationAction('d1')

    expect(result).toEqual({ status: 'ok', affectedPackages: [{ id: 'p1', name: 'Combo clásicas' }] })
  })

  it('rechaza desactivar mediante una llamada directa sin sesión staff', async () => {
    mocks.isStaff.mockResolvedValueOnce(false)

    const state = await deactivateTechniqueCascadeAction(
      initialActionState,
      form({ id: 'algo' }),
    )

    expect(state.status).toBe('forbidden')
    expect(mocks.deactivateCascade).not.toHaveBeenCalled()
  })

  it('desactiva la técnica y los paquetes confirmados', async () => {
    mocks.findById.mockResolvedValue(makeTechnique({ id: 'd1', isActive: true }))
    mocks.deactivateCascade.mockResolvedValueOnce(ok({ deactivatedPackageIds: ['p1'] }))

    const formData = form({ id: 'd1' })
    formData.append('packageId', 'p1')
    formData.append('packageName', 'Combo clásicas')
    const state = await deactivateTechniqueCascadeAction(initialActionState, formData)

    expect(state).toMatchObject({ status: 'ok' })
    expect(state.message).toContain('Combo clásicas')
    expect(mocks.deactivateCascade).toHaveBeenCalledWith('d1', ['p1'])
  })

  it('si la lista de paquetes afectados cambió, no desactiva nada y pide reintentar', async () => {
    mocks.findById.mockResolvedValue(makeTechnique({ id: 'd1', isActive: true }))
    mocks.deactivateCascade.mockResolvedValueOnce(
      err({ code: 'CATALOG_TECHNIQUE_AFFECTED_PACKAGES_RACE' }),
    )
    mocks.findActiveByTechniqueId.mockResolvedValueOnce([])

    const state = await deactivateTechniqueCascadeAction(initialActionState, form({ id: 'd1' }))

    expect(state.status).toBe('invalid')
    expect(state.problems?.[0]).toContain('cambiaron')
  })
})
