import { describe, it, expect } from 'vitest'
import { GALLERY_MAX_PAIRS } from '../../domain/gallery'
import { toGallery } from '../get-gallery'

// Un par de la colección `galeria` tal como lo entrega uno-cms
// (docs/contracts/cms-api.md § `galeria`), con la casilla marcada.
const par = (overrides: Record<string, unknown> = {}) => ({
  titulo: 'Clásicas de Ana',
  familia: 'lash_classic',
  antes: { mediaId: 'm1', url: 'https://cdn.test/antes.jpg', alt: 'Pestañas naturales antes' },
  despues: { mediaId: 'm2', url: 'https://cdn.test/despues.jpg', alt: 'Set clásico terminado' },
  consentimiento: true,
  ...overrides,
})

describe('toGallery — los pares que la landing puede publicar', () => {
  it('criterio 1: cada par trae su foto antes y su foto después, con su familia', () => {
    expect(toGallery([par()], 'https://cms.test')).toEqual([
      {
        family: 'lash_classic',
        before: { url: 'https://cdn.test/antes.jpg', alt: 'Pestañas naturales antes' },
        after: { url: 'https://cdn.test/despues.jpg', alt: 'Set clásico terminado' },
      },
    ])
  })

  it('criterio 4: sin la casilla de consentimiento marcada el par no se publica', () => {
    const pairs = toGallery(
      [
        par({ consentimiento: false }),
        // Ni ausente, ni un texto, ni un número cuentan como autorización.
        par({ consentimiento: undefined }),
        par({ consentimiento: 'true' }),
        par({ consentimiento: 1 }),
        par({ familia: 'lips' }),
      ],
      'https://cms.test',
    )

    expect(pairs.map((pair) => pair.family)).toEqual(['lips'])
  })

  it('una foto sola no es un par: sin las dos fotos válidas se ignora', () => {
    const pairs = toGallery(
      [
        par({ antes: { url: '', alt: '' } }),
        // Sin `alt` la foto no llega a la pantalla (UI-004).
        par({ despues: { url: 'https://cdn.test/d.jpg' } }),
      ],
      'https://cms.test',
    )

    expect(pairs).toEqual([])
  })

  it('un par con una familia fuera del contrato se ignora', () => {
    expect(toGallery([par({ familia: 'inventada' }), par({ familia: '' })], 'https://cms.test')).toEqual([])
  })

  it('respeta el orden del editor y corta en el máximo del contrato', () => {
    const items = Array.from({ length: GALLERY_MAX_PAIRS + 3 }, (_, index) =>
      par({ despues: { url: `https://cdn.test/${index}.jpg`, alt: `Par ${index}` } }),
    )

    const pairs = toGallery(items, 'https://cms.test')

    expect(pairs).toHaveLength(GALLERY_MAX_PAIRS)
    expect(pairs[0]?.after.alt).toBe('Par 0')
    expect(pairs.at(-1)?.after.alt).toBe(`Par ${GALLERY_MAX_PAIRS - 1}`)
  })

  it('los pares sin consentimiento no ocupan lugar dentro del máximo', () => {
    const items = [
      ...Array.from({ length: GALLERY_MAX_PAIRS }, () => par({ consentimiento: false })),
      par({ familia: 'henna' }),
    ]

    expect(toGallery(items, 'https://cms.test').map((pair) => pair.family)).toEqual(['henna'])
  })

  it('resuelve la ruta relativa de desarrollo contra CMS_URL', () => {
    const [pair] = toGallery(
      [par({ antes: { url: '/api/media/local/a', alt: 'Antes local' } })],
      'https://cms.test',
    )

    expect(pair?.before.url).toBe('https://cms.test/api/media/local/a')
  })

  it('sin respuesta del CMS la galería queda vacía, y no es un error', () => {
    expect(toGallery(null, 'https://cms.test')).toEqual([])
  })
})
