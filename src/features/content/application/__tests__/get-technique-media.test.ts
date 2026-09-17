import { describe, it, expect } from 'vitest'
import { toTechniqueMedia } from '../get-technique-media'

// Un elemento de la colección `tecnicas` tal como lo entrega uno-cms
// (docs/contracts/cms-api.md § `tecnicas`).
const fila = (overrides: Record<string, unknown> = {}) => ({
  nombre: 'Set clásico',
  familia: 'lash_classic',
  imagen: { mediaId: 'm1', url: 'https://cdn.test/clasico.jpg', alt: 'Set clásico' },
  ...overrides,
})

describe('toTechniqueMedia — las fotos del CMS, indexadas por familia', () => {
  it('indexa por familia y recoge los ejemplos que existan', () => {
    const media = toTechniqueMedia(
      [
        fila({
          ejemplo1: { url: 'https://cdn.test/e1.jpg', alt: 'A los 7 días' },
          ejemplo3: { url: 'https://cdn.test/e3.jpg', alt: 'Recién aplicado' },
        }),
      ],
      'https://cms.test',
    )

    expect(media.lash_classic?.image.url).toBe('https://cdn.test/clasico.jpg')
    // Las ranuras no se llenan en orden: falta ejemplo2 y los otros dos siguen valiendo.
    expect(media.lash_classic?.examples.map((e) => e.alt)).toEqual([
      'A los 7 días',
      'Recién aplicado',
    ])
  })

  it('de dos filas con la misma familia vale la primera del editor', () => {
    const media = toTechniqueMedia(
      [
        fila({ imagen: { url: 'https://cdn.test/primera.jpg', alt: 'Primera' } }),
        fila({ imagen: { url: 'https://cdn.test/segunda.jpg', alt: 'Segunda' } }),
      ],
      'https://cms.test',
    )

    expect(media.lash_classic?.image.alt).toBe('Primera')
  })

  it('descarta la fila sin familia y la fila sin foto principal válida', () => {
    const media = toTechniqueMedia(
      [
        fila({ familia: '   ' }),
        fila({ familia: 'brow_design', imagen: { url: '', alt: '' } }),
        // Sin `alt` no se publica: una foto sin texto alternativo no llega a la pantalla (UI-004).
        fila({ familia: 'henna', imagen: { url: 'https://cdn.test/h.jpg' } }),
      ],
      'https://cms.test',
    )

    expect(media).toEqual({})
  })

  it('una familia que el catálogo no conoce no estorba a las demás', () => {
    const media = toTechniqueMedia(
      [fila({ familia: 'inventada' }), fila({ familia: 'lips', nombre: 'Labios' })],
      'https://cms.test',
    )

    expect(Object.keys(media)).toContain('lips')
    // Queda indexada pero nadie la busca: el catálogo decide qué familias existen.
    expect(media.inventada).toBeTruthy()
  })

  it('resuelve la ruta relativa de desarrollo contra CMS_URL', () => {
    const media = toTechniqueMedia(
      [fila({ imagen: { url: '/api/media/local/abc', alt: 'Local' } })],
      'https://cms.test',
    )

    expect(media.lash_classic?.image.url).toBe('https://cms.test/api/media/local/abc')
  })

  it('sin respuesta del CMS no hay fotos, y no es un error', () => {
    expect(toTechniqueMedia(null, 'https://cms.test')).toEqual({})
    expect(toTechniqueMedia([], 'https://cms.test')).toEqual({})
  })
})
