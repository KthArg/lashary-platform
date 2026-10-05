import { beforeEach, describe, expect, it, vi } from 'vitest'
import { makeTechnique } from '@/features/catalog/application/techniques/__tests__/technique-fixture'

const mocks = vi.hoisted(() => ({
  isStaff: vi.fn(),
  packageSave: vi.fn(),
  packageFindById: vi.fn(),
  techniqueFindByIds: vi.fn(),
  packageDelete: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('@/features/catalog/ui/require-staff', () => ({
  isStaff: mocks.isStaff,
}))
vi.mock('@/features/catalog/db/packages/package-repository', () => ({
  packageRepository: vi.fn(async () => ({
    save: mocks.packageSave,
    findById: mocks.packageFindById,
    delete: mocks.packageDelete,
  })),
}))
vi.mock('@/features/catalog/db/techniques/technique-repository', () => ({
  techniqueRepository: vi.fn(async () => ({
    findByIds: mocks.techniqueFindByIds,
  })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))

import {
  createPackageAction,
  setPackageActiveAction,
  deletePackageAction,
} from '@/features/catalog/ui/packages/actions/package-actions'
import { initialPackageActionState } from '@/features/catalog/ui/packages/types/package-action-state'
import { ok, err } from '@/shared/result'
import { packageNameConflict } from '@/features/catalog/domain/packages/errors'
import { makePackage } from '@/features/catalog/application/packages/__tests__/package-fixture'

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
    mocks.packageSave.mockResolvedValue(ok(undefined))
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
    mocks.packageSave.mockResolvedValueOnce(err(packageNameConflict('Combo cejas')))

    const state = await createPackageAction(initialPackageActionState, form(validFields))

    expect(state.status).toBe('invalid')
    expect(state.problems).toEqual(['ya existe un paquete llamado "Combo cejas"'])
  })

  it('rechaza activar o desactivar mediante una llamada directa sin sesión staff', async () => {
    mocks.isStaff.mockResolvedValueOnce(false)

    const state = await setPackageActiveAction(
      initialPackageActionState,
      form({ id: 'algo', active: 'false' }, []),
    )

    expect(state.status).toBe('forbidden')
    expect(mocks.packageFindById).not.toHaveBeenCalled()
  })

  it('el interruptor reactiva un paquete desactivado', async () => {
    const pkg = makePackage({ id: 'p1', techniqueIds: ['t1', 't2'], isActive: false })
    mocks.packageFindById.mockResolvedValueOnce({ pkg, durationTotalMin: 90 })

    const state = await setPackageActiveAction(
      initialPackageActionState,
      form({ id: 'p1', active: 'true' }, []),
    )

    expect(state.status).toBe('ok')
    expect(mocks.packageSave.mock.calls[0][0].isActive).toBe(true)
  })

  it('rechaza eliminar mediante una llamada directa sin sesión staff', async () => {
    mocks.isStaff.mockResolvedValueOnce(false)

    const state = await deletePackageAction(initialPackageActionState, form({ id: 'p1' }, []))

    expect(state.status).toBe('forbidden')
    expect(mocks.packageDelete).not.toHaveBeenCalled()
  })

  it('elimina el paquete y vuelve al listado', async () => {
    const pkg = makePackage({ id: 'p1' })
    mocks.packageFindById.mockResolvedValueOnce({ pkg, durationTotalMin: 90 })

    await deletePackageAction(initialPackageActionState, form({ id: 'p1' }, []))

    expect(mocks.packageDelete).toHaveBeenCalledWith('p1')
    expect(mocks.redirect).toHaveBeenCalledWith('/admin/catalog/packages')
  })
})
