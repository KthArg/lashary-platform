import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  isStaff: vi.fn(),
  save: vi.fn(),
  findById: vi.fn(),
}))

vi.mock('@/features/store/ui/admin-products/actions/staff-permission', () => ({
  isStaff: mocks.isStaff,
}))
vi.mock('@/features/store/db/admin-product-repository', () => ({
  adminProductRepository: vi.fn(async () => ({
    save: mocks.save,
    findById: mocks.findById,
  })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import {
  createProductAction,
  deactivateProductAction,
} from '@/features/store/ui/admin-products/actions/product-actions'
import { initialProductActionState } from '@/features/store/ui/admin-products/types/product-action-state'
import { createDuplicateProductSlug } from '@/features/store/domain/product-errors'

function form(fields: Record<string, string>): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) formData.set(key, value)
  return formData
}

const validFields = {
  slug: 'serum-nutritivo-lashary',
  name: 'Serum nutritivo Lashary',
  description: 'Tratamiento nutritivo.',
  imageUrl: '/productos/serum-nutritivo.jpg',
  priceCrc: '18000',
  displayOrder: '1',
}

describe('acciones administrativas de productos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isStaff.mockResolvedValue(true)
    mocks.save.mockResolvedValue(undefined)
  })

  it('rechaza una llamada directa sin sesión staff antes de tocar el repositorio', async () => {
    mocks.isStaff.mockResolvedValueOnce(false)

    const state = await createProductAction(initialProductActionState, form(validFields))

    expect(state.status).toBe('forbidden')
    expect(state.message).toContain('permisos')
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('valida los datos de una administradora antes de guardar', async () => {
    const state = await createProductAction(
      initialProductActionState,
      form({ ...validFields, slug: '', priceCrc: '-1' }),
    )

    expect(state.status).toBe('invalid')
    expect(state.problems?.length).toBeGreaterThanOrEqual(2)
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('permite crear un producto a una administradora', async () => {
    const state = await createProductAction(initialProductActionState, form(validFields))

    expect(state).toMatchObject({ status: 'ok', message: 'Producto creado.' })
    expect(mocks.save).toHaveBeenCalledTimes(1)
  })

  it('DOM-006: un slug duplicado vuelve como estado "invalid" con mensaje, no como excepción', async () => {
    mocks.save.mockRejectedValueOnce(createDuplicateProductSlug('serum-nutritivo-lashary'))

    const state = await createProductAction(initialProductActionState, form(validFields))

    expect(state.status).toBe('invalid')
    expect(state.problems).toEqual([
      'ya existe un producto con el slug "serum-nutritivo-lashary"',
    ])
  })

  it('rechaza desactivar mediante una llamada directa sin sesión staff', async () => {
    mocks.isStaff.mockResolvedValueOnce(false)

    const state = await deactivateProductAction(initialProductActionState, form({ id: 'algo' }))

    expect(state.status).toBe('forbidden')
    expect(mocks.findById).not.toHaveBeenCalled()
  })
})
