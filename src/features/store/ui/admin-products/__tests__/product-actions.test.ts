import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  isStaff: vi.fn(),
  save: vi.fn(),
  findById: vi.fn(),
  listSlugsStartingWith: vi.fn(),
  upload: vi.fn(),
  remove: vi.fn(),
}))

const BUCKET_URL = 'http://localhost:54321/storage/v1/object/public/store-product-images/'

vi.mock('@/features/store/db/product-image-storage', () => ({
  productImageStorage: vi.fn(async () => ({
    upload: mocks.upload,
    remove: mocks.remove,
    pathFromUrl: (url: string) => (url.startsWith(BUCKET_URL) ? url.slice(BUCKET_URL.length) : null),
  })),
}))

vi.mock('@/features/store/ui/admin-products/actions/staff-permission', () => ({
  isStaff: mocks.isStaff,
}))
vi.mock('@/features/store/db/admin-product-repository', () => ({
  adminProductRepository: vi.fn(async () => ({
    save: mocks.save,
    findById: mocks.findById,
    listSlugsStartingWith: mocks.listSlugsStartingWith,
  })),
}))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import {
  createProductAction,
  updateProductAction,
  deactivateProductAction,
  activateProductAction,
} from '@/features/store/ui/admin-products/actions/product-actions'
import { makeProduct } from '@/features/store/application/admin-products/__tests__/product-fixture'
import { initialProductActionState } from '@/features/store/ui/admin-products/types/product-action-state'
import { createDuplicateProductSlug } from '@/features/store/domain/product-errors'
import { productStrings } from '@/features/store/ui/admin-products/constants/product-strings'

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00])
const pngFile = () => new File([PNG_BYTES], 'serum.png', { type: 'image/png' })

function form(fields: Record<string, string>, image?: File): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) formData.set(key, value)
  if (image) formData.set('image', image)
  return formData
}

const validFields = {
  name: 'Serum nutritivo Lashary',
  description: 'Tratamiento nutritivo.',
  priceCrc: '18000',
  displayOrder: '1',
  stock: '4',
}

describe('acciones administrativas de productos', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.isStaff.mockResolvedValue(true)
    mocks.save.mockResolvedValue(undefined)
    mocks.listSlugsStartingWith.mockResolvedValue([])
    mocks.upload.mockImplementation(async (path: string) => `${BUCKET_URL}${path}`)
    mocks.remove.mockResolvedValue(undefined)
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
      form({ ...validFields, name: '', priceCrc: '-1' }),
    )

    expect(state.status).toBe('invalid')
    expect(state.problems?.length).toBeGreaterThanOrEqual(2)
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('no guarda si la administradora deja vacío el campo de existencias', async () => {
    const state = await createProductAction(
      initialProductActionState,
      form({ ...validFields, stock: '' }),
    )

    expect(state.status).toBe('invalid')
    expect(state.problems).toContain(productStrings.form.validation.stockRequired)
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('permite crear un producto a una administradora, con la imagen subida al bucket', async () => {
    const state = await createProductAction(initialProductActionState, form(validFields, pngFile()))

    expect(state).toMatchObject({ status: 'ok', message: 'Producto creado.' })
    expect(mocks.upload).toHaveBeenCalledWith(expect.stringMatching(/\.png$/), PNG_BYTES, 'image/png')
    const saved = mocks.save.mock.calls[0][0]
    expect(saved.imageUrl).toBe(`${BUCKET_URL}${mocks.upload.mock.calls[0][0]}`)
    expect(mocks.upload.mock.calls[0][0].startsWith(`${saved.id}/`)).toBe(true)
  })

  it('crear exige una imagen', async () => {
    const state = await createProductAction(initialProductActionState, form(validFields))

    expect(state.problems).toContain(productStrings.form.validation.imageRequired)
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('DOM-008: un archivo que no es imagen no se sube aunque se llame .jpg', async () => {
    const fake = new File([new TextEncoder().encode('no soy foto')], 'foto.jpg', { type: 'image/jpeg' })

    const state = await createProductAction(initialProductActionState, form(validFields, fake))

    expect(state.status).toBe('invalid')
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(mocks.save).not.toHaveBeenCalled()
  })

  it('DOM-006: un slug duplicado vuelve como "invalid" y borra la imagen recién subida', async () => {
    mocks.save.mockRejectedValueOnce(createDuplicateProductSlug('serum-nutritivo-lashary'))

    const state = await createProductAction(initialProductActionState, form(validFields, pngFile()))

    expect(state.status).toBe('invalid')
    expect(state.problems).toEqual([
      'ya existe un producto con el slug "serum-nutritivo-lashary"',
    ])
    expect(mocks.remove).toHaveBeenCalledWith(mocks.upload.mock.calls[0][0])
  })

  it('editar sin elegir imagen conserva la actual y no sube nada', async () => {
    const existing = makeProduct({ id: 'e1' })
    mocks.findById.mockResolvedValue(existing)

    const state = await updateProductAction(initialProductActionState, form({ ...validFields, id: 'e1' }))

    expect(state.status).toBe('ok')
    expect(mocks.upload).not.toHaveBeenCalled()
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ imageUrl: existing.imageUrl }))
    expect(mocks.remove).not.toHaveBeenCalled()
  })

  it('editar con una imagen nueva la sube y borra la anterior del bucket', async () => {
    mocks.findById.mockResolvedValue({
      ...makeProduct({ id: 'e2' }),
      imageUrl: `${BUCKET_URL}e2/vieja.png`,
    })

    const state = await updateProductAction(
      initialProductActionState,
      form({ ...validFields, id: 'e2' }, pngFile()),
    )

    expect(state.status).toBe('ok')
    expect(mocks.upload).toHaveBeenCalledWith(expect.stringMatching(/^e2\/.+\.png$/), PNG_BYTES, 'image/png')
    expect(mocks.remove).toHaveBeenCalledWith('e2/vieja.png')
  })

  it('editar un producto que no existe no sube nada', async () => {
    mocks.findById.mockResolvedValue(null)

    const state = await updateProductAction(
      initialProductActionState,
      form({ ...validFields, id: 'nope' }, pngFile()),
    )

    expect(state.status).toBe('invalid')
    expect(mocks.upload).not.toHaveBeenCalled()
  })

  it('permite a una administradora volver a activar un producto desactivado', async () => {
    mocks.findById.mockResolvedValueOnce(makeProduct({ id: 'inactivo', isActive: false }))

    const state = await activateProductAction(initialProductActionState, form({ id: 'inactivo' }))

    expect(state).toMatchObject({ status: 'ok', message: productStrings.form.activated })
    expect(mocks.save).toHaveBeenCalledWith(expect.objectContaining({ id: 'inactivo', isActive: true }))
  })

  it('rechaza activar mediante una llamada directa sin sesión staff', async () => {
    mocks.isStaff.mockResolvedValueOnce(false)

    const state = await activateProductAction(initialProductActionState, form({ id: 'algo' }))

    expect(state.status).toBe('forbidden')
    expect(mocks.findById).not.toHaveBeenCalled()
  })

  it('rechaza desactivar mediante una llamada directa sin sesión staff', async () => {
    mocks.isStaff.mockResolvedValueOnce(false)

    const state = await deactivateProductAction(initialProductActionState, form({ id: 'algo' }))

    expect(state.status).toBe('forbidden')
    expect(mocks.findById).not.toHaveBeenCalled()
  })
})
