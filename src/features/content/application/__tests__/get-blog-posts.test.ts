import { describe, it, expect, vi } from 'vitest'
import { toBlogPosts } from '../get-blog-posts'

// Una publicación de la colección `posts` tal como la entrega uno-cms
// (docs/contracts/cms-api.md § `posts`).
const publicacion = (overrides: Record<string, unknown> = {}) => ({
  titulo: 'Cómo cuidar tus extensiones',
  slug: '',
  extracto: 'Lo que conviene hacer la primera semana.',
  imagen: { mediaId: 'm1', url: 'https://cdn.test/destacada.jpg', alt: 'Extensiones recién puestas' },
  fecha: '2026-10-13',
  cuerpo: { type: 'doc', content: [] },
  ...overrides,
})

const CMS = 'https://cms.test'

describe('toBlogPosts — las publicaciones que el listado puede mostrar', () => {
  it('criterio 2: cada publicación trae su imagen, su título y su extracto', () => {
    expect(toBlogPosts([publicacion()], CMS)).toEqual([
      {
        slug: 'como-cuidar-tus-extensiones',
        title: 'Cómo cuidar tus extensiones',
        excerpt: 'Lo que conviene hacer la primera semana.',
        image: { url: 'https://cdn.test/destacada.jpg', alt: 'Extensiones recién puestas' },
        publishedOn: '2026-10-13',
      },
    ])
  })

  it('criterio 1: salen por fecha de publicación descendente, no en el orden del editor', () => {
    const posts = toBlogPosts(
      [
        publicacion({ titulo: 'Marzo', fecha: '2026-03-01' }),
        publicacion({ titulo: 'Octubre', fecha: '2026-10-13' }),
        publicacion({ titulo: 'Enero', fecha: '2026-01-20' }),
      ],
      CMS,
    )
    expect(posts.map((post) => post.title)).toEqual(['Octubre', 'Marzo', 'Enero'])
  })

  it('una fecha que no se puede leer manda la publicación al final', () => {
    const posts = toBlogPosts(
      [
        publicacion({ titulo: 'Sin fecha', fecha: 'ayer' }),
        publicacion({ titulo: 'Con fecha', fecha: '2026-01-01' }),
      ],
      CMS,
    )
    expect(posts.map((post) => [post.title, post.publishedOn])).toEqual([
      ['Con fecha', '2026-01-01'],
      ['Sin fecha', null],
    ])
  })

  it('sin título, sin extracto o sin imagen con su alt la publicación se ignora', () => {
    const posts = toBlogPosts(
      [
        publicacion({ titulo: '' }),
        publicacion({ extracto: undefined }),
        publicacion({ imagen: { url: 'https://cdn.test/a.jpg', alt: '' } }),
        publicacion({ imagen: { url: '', alt: 'Sin imagen' } }),
        publicacion({ titulo: 'La completa' }),
      ],
      CMS,
    )
    expect(posts.map((post) => post.title)).toEqual(['La completa'])
  })

  it('el slug del campo manda sobre el título, y también se normaliza', () => {
    const [post] = toBlogPosts([publicacion({ slug: 'Cuidados Básicos' })], CMS)
    expect(post.slug).toBe('cuidados-basicos')
  })

  it('dos publicaciones con el mismo slug: queda la primera del editor y se avisa', () => {
    const warn = vi.fn()
    const posts = toBlogPosts(
      [
        publicacion({ slug: 'cuidados', titulo: 'La primera', fecha: '2026-01-01' }),
        publicacion({ slug: 'cuidados', titulo: 'La repetida', fecha: '2026-06-01' }),
      ],
      CMS,
      warn,
    )
    expect(posts.map((post) => post.title)).toEqual(['La primera'])
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('un título del que no sale ningún slug descarta la publicación y se avisa', () => {
    const warn = vi.fn()
    expect(toBlogPosts([publicacion({ titulo: '¿¡!?' })], CMS, warn)).toEqual([])
    expect(warn).toHaveBeenCalledTimes(1)
  })

  it('una imagen de ruta relativa se resuelve contra el CMS', () => {
    const [post] = toBlogPosts(
      [publicacion({ imagen: { url: '/api/media/local/a.webp', alt: 'Foto' } })],
      CMS,
    )
    expect(post.image.url).toBe('https://cms.test/api/media/local/a.webp')
  })

  it('una fila que no es un objeto no rompe la lectura, y sin filas no hay publicaciones', () => {
    expect(toBlogPosts([null, 'texto', 7, publicacion()], CMS)).toHaveLength(1)
    expect(toBlogPosts(null, CMS)).toEqual([])
  })
})
