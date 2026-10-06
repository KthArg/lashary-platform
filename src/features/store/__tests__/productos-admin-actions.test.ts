import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  esStaff: vi.fn(),
  save: vi.fn(),
  findById: vi.fn(),
}))

vi.mock('@/features/store/actions/permiso-staff', () => ({
  esStaff: mocks.esStaff,
}))
vi.mock('@/features/store/db/admin-product-repository', () => ({
  productoRepositorioAdmin: vi.fn(async () => ({
    save: mocks.save,
    findById: mocks.findById,
  })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import {
  crearProductoAction,
  desactivarProductoAction,
} from '@/features/store/actions/productos-admin-actions'
import { estadoAccionInicial } from '@/features/store/actions/estado-accion-producto'
import { crearProductoSlugDuplicado } from '@/features/store/domain/product-errors'

function form(fields: Record<string, string>): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) formData.set(key, value)
  return formData
}

const validFields = {
  slug: 'serum-nutritivo-lashary',
  nombre: 'Serum nutritivo Lashary',
  descripcion: 'Tratamiento nutritivo.',
  urlImagen: '/productos/serum-nutritivo.jpg',
  precioCrc: '18000',
  ordenPresentacion: '1',
}

describe('acciones administrativas de productos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.esStaff.mockResolvedValue(true)
    mocks.save.mockResolvedValue(undefined)
  })

  it('rechaza una llamada directa sin sesión staff antes de tocar el repositorio', async () => {
    mocks.esStaff.mockResolvedValueOnce(false)

    const state = await crearProductoAction(estadoAccionInicial, form(validFields))

    expect(state.status).toBe('forbidden')
    expect(state.message).toContain('permisos')
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('valida los datos de una administradora antes de guardar', async () => {
    const state = await crearProductoAction(
      estadoAccionInicial,
      form({ ...validFields, slug: '', precioCrc: '-1' }),
    )

    expect(state.status).toBe('invalid')
    expect(state.problems?.length).toBeGreaterThanOrEqual(2)
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('permite crear un producto a una administradora', async () => {
    const state = await crearProductoAction(estadoAccionInicial, form(validFields))

    expect(state).toMatchObject({ status: 'ok', message: 'Producto creado.' })
    expect(mocks.save).toHaveBeenCalledTimes(1)
  })

  it('DOM-006: un slug duplicado vuelve como estado "invalid" con mensaje, no como excepción', async () => {
    mocks.save.mockRejectedValueOnce(crearProductoSlugDuplicado('serum-nutritivo-lashary'))

    const state = await crearProductoAction(estadoAccionInicial, form(validFields))

    expect(state.status).toBe('invalid')
    expect(state.problems).toEqual([
      'ya existe un producto con el slug "serum-nutritivo-lashary"',
    ])
  })

  it('rechaza desactivar mediante una llamada directa sin sesión staff', async () => {
    mocks.esStaff.mockResolvedValueOnce(false)

    const state = await desactivarProductoAction(estadoAccionInicial, form({ id: 'algo' }))

    expect(state.status).toBe('forbidden')
    expect(mocks.findById).not.toHaveBeenCalled()
  })
})
