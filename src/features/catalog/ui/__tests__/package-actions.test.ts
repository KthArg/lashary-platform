import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeTechnique } from '@/features/catalog/application/__tests__/technique-fixture'

const mocks = vi.hoisted(() => ({
  isStaff: vi.fn(),
  packageSave: vi.fn(),
  packageFindById: vi.fn(),
  techniqueFindByIds: vi.fn(),
}))

vi.mock('@/features/catalog/ui/require-staff', () => ({
  isStaff: mocks.isStaff,
}))
vi.mock('@/features/catalog/db/package-repository', () => ({
  packageRepository: vi.fn(async () => ({
    save: mocks.packageSave,
    findById: mocks.packageFindById,
  })),
}))
vi.mock('@/features/catalog/db/technique-repository', () => ({
  techniqueRepository: vi.fn(async () => ({
    findByIds: mocks.techniqueFindByIds,
  })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import {
  createPackageAction,
  deactivatePackageAction,
} from '@/features/catalog/ui/package-actions'
import { initialPackageActionState } from '@/features/catalog/ui/action-state'
import { PackageNameConflict } from '@/features/catalog/domain/errors'

function form(
  fields: Record<string, string>,
  techniqueIds: string[] = ['t1', 't2'],
): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) formData.set(key, value)
  for (const id of techniqueIds) formData.append('techniqueIds', id)
  return formData
}

const validFields = { name: 'Combo cejas', price: '30000' }
const activeTechniques = [
  makeTechnique({ id: 't1', isActive: true }),
  makeTechnique({ id: 't2', isActive: true }),
]

describe('acciones administrativas de paquetes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isStaff.mockResolvedValue(true)
    mocks.packageSave.mockResolvedValue(undefined)
    mocks.techniqueFindByIds.mockResolvedValue(activeTechniques)
  })

  it('rechaza una llamada directa sin sesión staff antes de tocar el repositorio', async () => {
    mocks.isStaff.mockResolvedValueOnce(false)

    const state = await createPackageAction(initialPackageActionState, form(validFields))

    expect(state.status).toBe('forbidden')
    expect(state.message).toContain('permisos')
    expect(mocks.packageSave).not.toHaveBeenCalled()
  })

  it('valida el formulario antes de guardar (menos de dos técnicas)', async () => {
    const state = await createPackageAction(
      initialPackageActionState,
      form(validFields, ['t1']),
    )

    expect(state.status).toBe('invalid')
    expect(state.problems?.length).toBeGreaterThanOrEqual(1)
    expect(mocks.packageSave).not.toHaveBeenCalled()
  })

  it('permite crear un paquete a una administradora (criterio 1)', async () => {
    const state = await createPackageAction(initialPackageActionState, form(validFields))

    expect(state).toMatchObject({ status: 'ok', message: 'Paquete creado.' })
    expect(mocks.packageSave).toHaveBeenCalledTimes(1)
  })

  it('rechaza si alguna técnica no existe o no está activa, sin guardar', async () => {
    mocks.techniqueFindByIds.mockResolvedValueOnce([
      makeTechnique({ id: 't1', isActive: true }),
    ])

    const state = await createPackageAction(initialPackageActionState, form(validFields))

    expect(state.status).toBe('invalid')
    expect(mocks.packageSave).not.toHaveBeenCalled()
  })

  it('DOM-006: un nombre duplicado vuelve como estado "invalid" con mensaje, no como excepción', async () => {
    mocks.packageSave.mockRejectedValueOnce(new PackageNameConflict('Combo cejas'))

    const state = await createPackageAction(initialPackageActionState, form(validFields))

    expect(state.status).toBe('invalid')
    expect(state.problems).toEqual(['ya existe un paquete llamado "Combo cejas"'])
  })

  it('rechaza desactivar mediante una llamada directa sin sesión staff', async () => {
    mocks.isStaff.mockResolvedValueOnce(false)

    const state = await deactivatePackageAction(
      initialPackageActionState,
      form({ id: 'algo' }, []),
    )

    expect(state.status).toBe('forbidden')
    expect(mocks.packageFindById).not.toHaveBeenCalled()
  })
})
