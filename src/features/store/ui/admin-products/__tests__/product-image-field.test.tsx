import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { ProductImageField } from '@/features/store/ui/admin-products/components/ProductImageField'
import { productStrings } from '@/features/store/ui/admin-products/constants/product-strings'

const fieldMessages = productStrings.form.fields
const CURRENT_IMAGE_URL = 'http://storage.local/producto-actual.png'
const CHOSEN_PREVIEW_URL = 'blob:vista-previa-elegida'

const stubObjectUrls = () => {
  const createObjectURL = vi.fn(() => CHOSEN_PREVIEW_URL)
  const revokeObjectURL = vi.fn()
  vi.stubGlobal('URL', Object.assign(URL, { createObjectURL, revokeObjectURL }))
  return { createObjectURL, revokeObjectURL }
}

const renderInForm = (props: { required: boolean; previewUrl?: string; hidePreview: boolean }) =>
  render(
    <form data-testid="product-form">
      <ProductImageField {...props} />
    </form>,
  )

const chooseImage = (label: string) => {
  const file = new File([new Uint8Array([1])], 'producto.png', { type: 'image/png' })
  fireEvent.change(screen.getByLabelText(new RegExp(label)), { target: { files: [file] } })
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('campo de imagen del producto: recuadro con más', () => {
  it('al crear ofrece el recuadro para agregar, la imagen es obligatoria y no hay imagen actual', () => {
    renderInForm({ required: true, hidePreview: true })

    const input = screen.getByLabelText(new RegExp(fieldMessages.addImage)) as HTMLInputElement

    expect(input.name).toBe('image')
    expect(input.type).toBe('file')
    expect(input.required).toBe(true)
    expect(input.accept).toBe('image/jpeg,image/png,image/webp')
    expect(screen.getByText(fieldMessages.imageHint)).toBeTruthy()
    expect(screen.queryByText(fieldMessages.currentImage)).toBeNull()
  })

  it('al editar muestra la imagen actual y el recuadro ofrece cambiarla, sin ser obligatoria', () => {
    renderInForm({ required: false, previewUrl: CURRENT_IMAGE_URL, hidePreview: false })

    const input = screen.getByLabelText(new RegExp(fieldMessages.changeImage)) as HTMLInputElement
    const currentImage = document.querySelector(`img[src="${CURRENT_IMAGE_URL}"]`)

    expect(input.name).toBe('image')
    expect(input.required).toBe(false)
    expect(currentImage).not.toBeNull()
    expect(screen.getByText(fieldMessages.currentImage)).toBeTruthy()
  })

  it('al elegir un archivo el recuadro muestra su vista previa y el archivo sigue en el input del formulario', () => {
    stubObjectUrls()
    renderInForm({ required: true, hidePreview: true })

    chooseImage(fieldMessages.addImage)

    const preview = screen.getByAltText(fieldMessages.chosenImageAlt)
    const input = screen.getByLabelText(new RegExp(fieldMessages.changeImage)) as HTMLInputElement

    expect(preview.getAttribute('src')).toBe(CHOSEN_PREVIEW_URL)
    expect(input.files?.[0]?.name).toBe('producto.png')
    expect(screen.queryByText(fieldMessages.imageHint)).toBeNull()
  })

  it('al reiniciarse el formulario el recuadro vuelve a estar vacío y libera la vista previa', () => {
    const { revokeObjectURL } = stubObjectUrls()
    renderInForm({ required: true, hidePreview: true })
    chooseImage(fieldMessages.addImage)

    fireEvent.reset(screen.getByTestId('product-form'))

    expect(screen.queryByAltText(fieldMessages.chosenImageAlt)).toBeNull()
    expect(screen.getByText(fieldMessages.addImage)).toBeTruthy()
    expect(revokeObjectURL).toHaveBeenCalledWith(CHOSEN_PREVIEW_URL)
  })
})
