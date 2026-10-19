import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ImagesEditor } from '../components/ImagesEditor'
import { IMAGES_LABELS, RECORD_LABELS } from '../constants/record-strings'

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'
const PATHS = [`${CLIENT_ID}/a.png`, `${CLIENT_ID}/b.jpg`]
const SIGNED = { [PATHS[0]]: 'http://storage.local/firmada-a', [PATHS[1]]: 'http://storage.local/firmada-b' }

const mocks = vi.hoisted(() => ({ refresh: vi.fn(), upload: vi.fn() }))
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mocks.refresh }) }))
vi.mock('../actions/record-actions', () => ({ addRecordImageAction: mocks.upload }))

beforeEach(() => vi.clearAllMocks())

const chooseAndUpload = () => {
  const file = new File([new Uint8Array([1])], 'estudio.png', { type: 'image/png' })
  fireEvent.change(screen.getByLabelText(IMAGES_LABELS.field), { target: { files: [file] } })
  fireEvent.submit(screen.getByRole('button', { name: IMAGES_LABELS.upload }).closest('form') as HTMLFormElement)
}

describe('ImagesEditor — imágenes del expediente (criterios 1 y 5)', () => {
  it('muestra cada imagen con su URL firmada y un texto alternativo propio', () => {
    render(<ImagesEditor clientId={CLIENT_ID} images={PATHS} imageUrls={SIGNED} />)
    const images = screen.getAllByRole('img')
    expect(images.map((image) => image.getAttribute('src'))).toEqual([SIGNED[PATHS[0]], SIGNED[PATHS[1]]])
    expect(images.map((image) => image.getAttribute('alt'))).toEqual([IMAGES_LABELS.imageAlt(1), IMAGES_LABELS.imageAlt(2)])
  })

  it('nunca arma una URL a partir de la ruta: sin firma, dice que no está disponible', () => {
    render(<ImagesEditor clientId={CLIENT_ID} images={PATHS} imageUrls={{}} />)
    expect(screen.queryAllByRole('img')).toEqual([])
    expect(screen.getAllByText(IMAGES_LABELS.unavailable)).toHaveLength(2)
  })

  it('sin imágenes lo dice y ofrece subir una', () => {
    render(<ImagesEditor clientId={CLIENT_ID} images={[]} imageUrls={{}} />)
    expect(screen.getByText(RECORD_LABELS.noImages)).toBeTruthy()
    expect(screen.getByLabelText(IMAGES_LABELS.field).getAttribute('accept')).toBe(IMAGES_LABELS.accept)
  })

  it('sube la imagen elegida y refresca', async () => {
    mocks.upload.mockResolvedValue({ ok: true, version: {} })
    render(<ImagesEditor clientId={CLIENT_ID} images={[]} imageUrls={{}} />)
    chooseAndUpload()
    await waitFor(() => expect(mocks.refresh).toHaveBeenCalled())
    expect(mocks.upload.mock.calls[0][0]).toBe(CLIENT_ID)
    expect(mocks.upload.mock.calls[0][1]).toBeInstanceOf(FormData)
  })

  it('si el servidor rechaza la imagen, lo anuncia', async () => {
    mocks.upload.mockResolvedValue({ ok: false, error: 'La imagen pesa más de 1 MB.', problems: [] })
    render(<ImagesEditor clientId={CLIENT_ID} images={[]} imageUrls={{}} />)
    chooseAndUpload()
    expect((await screen.findByRole('alert')).textContent).toBe('La imagen pesa más de 1 MB.')
    expect(mocks.refresh).not.toHaveBeenCalled()
  })
})
