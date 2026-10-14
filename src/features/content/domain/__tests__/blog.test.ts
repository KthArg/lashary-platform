import { describe, it, expect } from 'vitest'
import {
  BLOG_PAGE_SIZE,
  articleBySlug,
  calendarDate,
  newestFirst,
  pageOf,
  slugify,
  type BlogPost,
} from '../blog'

const post = (slug: string, publishedOn: string | null): BlogPost => ({
  slug,
  title: slug,
  excerpt: 'Extracto',
  image: { url: 'https://cdn.test/a.jpg', alt: 'Foto' },
  publishedOn,
})

const slugs = (posts: readonly BlogPost[]) => posts.map((item) => item.slug)

describe('slugify — la identidad de ruta de una publicación', () => {
  it('pasa a minúsculas, quita diacríticos y une con guiones', () => {
    expect(slugify('Cómo cuidar tus Extensiones')).toBe('como-cuidar-tus-extensiones')
    expect(slugify('Pestañas: ¿clásico o volumen?')).toBe('pestanas-clasico-o-volumen')
  })

  it('no deja guiones en los extremos, ni al recortar a 80', () => {
    expect(slugify('  ¡Hola!  ')).toBe('hola')
    const recortado = slugify(`${'a'.repeat(79)} b`)
    expect(recortado).toBe('a'.repeat(79))
  })

  it('queda vacío cuando no hay nada que sirva para una ruta', () => {
    expect(slugify('¿¡!?')).toBe('')
  })
})

describe('calendarDate — la fecha del CMS es texto', () => {
  it('acepta una fecha de calendario en AAAA-MM-DD', () => {
    expect(calendarDate('2026-10-13')).toBe('2026-10-13')
  })

  it('rechaza otro formato y un día que no existe', () => {
    expect(calendarDate('13/10/2026')).toBeNull()
    expect(calendarDate('2026-02-30')).toBeNull()
    expect(calendarDate('2026-13-01')).toBeNull()
    expect(calendarDate('2026-04-31')).toBeNull()
    expect(calendarDate('2026-00-10')).toBeNull()
  })

  it('el 29 de febrero existe solo en año bisiesto', () => {
    expect(calendarDate('2028-02-29')).toBe('2028-02-29')
    expect(calendarDate('2026-02-29')).toBeNull()
    expect(calendarDate('2100-02-29')).toBeNull()
  })
})

describe('newestFirst — criterio 1: fecha de publicación descendente', () => {
  it('ordena de la más reciente a la más antigua', () => {
    const ordered = newestFirst([
      post('marzo', '2026-03-01'),
      post('octubre', '2026-10-13'),
      post('enero', '2026-01-20'),
    ])
    expect(slugs(ordered)).toEqual(['octubre', 'marzo', 'enero'])
  })

  it('con la misma fecha conserva el orden del editor', () => {
    const ordered = newestFirst([
      post('primera', '2026-05-05'),
      post('segunda', '2026-05-05'),
      post('tercera', '2026-05-05'),
    ])
    expect(slugs(ordered)).toEqual(['primera', 'segunda', 'tercera'])
  })

  it('las que no tienen fecha van al final, en el orden del editor', () => {
    const ordered = newestFirst([
      post('sin-fecha-a', null),
      post('vieja', '2020-01-01'),
      post('sin-fecha-b', null),
      post('nueva', '2026-01-01'),
    ])
    expect(slugs(ordered)).toEqual(['nueva', 'vieja', 'sin-fecha-a', 'sin-fecha-b'])
  })
})

describe('articleBySlug — US-BLOG-03: una publicación por su dirección', () => {
  const posts = [post('cuidados', '2026-01-01'), post('retoques', '2026-02-01')]

  it('devuelve la publicación de ese slug', () => {
    expect(articleBySlug(posts, 'retoques')?.slug).toBe('retoques')
  })

  it('un slug que no existe, o escrito de otra forma, no encuentra nada', () => {
    expect(articleBySlug(posts, 'no-existe')).toBeNull()
    expect(articleBySlug(posts, 'Cuidados')).toBeNull()
    expect(articleBySlug(posts, '')).toBeNull()
  })
})

describe('pageOf — criterio 3: paginación sobre un límite configurado', () => {
  const twenty = Array.from({ length: 20 }, (_, index) => post(`p${index + 1}`, null))

  it('el límite configurado es 9', () => {
    expect(BLOG_PAGE_SIZE).toBe(9)
  })

  it('la primera página trae el límite y dice cuántas páginas hay', () => {
    const first = pageOf(twenty, 1)
    expect(slugs(first.posts)).toEqual(slugs(twenty.slice(0, 9)))
    expect(first).toMatchObject({ page: 1, pageCount: 3, total: 20 })
  })

  it('la última página trae el resto', () => {
    expect(slugs(pageOf(twenty, 3).posts)).toEqual(['p19', 'p20'])
  })

  it('respeta otro límite', () => {
    expect(pageOf(twenty, 2, 5)).toMatchObject({ page: 2, pageCount: 4 })
    expect(slugs(pageOf(twenty, 2, 5).posts)).toEqual(['p6', 'p7', 'p8', 'p9', 'p10'])
  })

  it('una página que no existe cae en la más cercana que sí', () => {
    expect(pageOf(twenty, 99).page).toBe(3)
    expect(pageOf(twenty, 0).page).toBe(1)
    expect(pageOf(twenty, -4).page).toBe(1)
    expect(pageOf(twenty, 1.5).page).toBe(1)
    expect(pageOf(twenty, Number.NaN).page).toBe(1)
  })

  it('sin publicaciones hay una sola página, vacía', () => {
    expect(pageOf([], 1)).toEqual({ posts: [], page: 1, pageCount: 1, total: 0 })
  })
})
