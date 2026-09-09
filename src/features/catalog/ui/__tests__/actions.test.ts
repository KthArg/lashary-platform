import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  isStaff: vi.fn(),
  save: vi.fn(),
  findById: vi.fn(),
}))

vi.mock('@/features/catalog/ui/require-staff', () => ({
  isStaff: mocks.isStaff,
}))
vi.mock('@/features/catalog/db/technique-repository', () => ({
  techniqueRepository: vi.fn(async () => ({
    save: mocks.save,
    findById: mocks.findById,
  })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import {
  createTechniqueAction,
  deactivateTechniqueAction,
} from '@/features/catalog/ui/actions'
import { initialActionState } from '@/features/catalog/ui/action-state'
import { TechniqueNameConflict } from '@/features/catalog/domain/errors'

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
    mocks.save.mockResolvedValue(undefined)
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
    mocks.save.mockRejectedValueOnce(new TechniqueNameConflict('Set volumen'))

    const state = await createTechniqueAction(
      initialActionState,
      form(validFields),
    )

    expect(state.status).toBe('invalid')
    expect(state.problems).toEqual(['ya existe una técnica llamada "Set volumen"'])
  })

  it('rechaza desactivar mediante una llamada directa sin sesión staff', async () => {
    mocks.isStaff.mockResolvedValueOnce(false)

    const state = await deactivateTechniqueAction(
      initialActionState,
      form({ id: 'algo' }),
    )

    expect(state.status).toBe('forbidden')
    expect(mocks.findById).not.toHaveBeenCalled()
  })
})
