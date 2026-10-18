import { describe, it, expect, vi } from 'vitest'
import { err, ok } from '@/shared/result'
import { cmsUnavailable } from '../../domain/errors'
import type { CmsReader } from '../../application/ports'
import { blogCacheTag, loadBlogArticle, loadBlogPage } from '../blog-source'
import { LANDING_CACHE_SECONDS } from '../landing-source'

const passthroughCache = vi.fn((fn: () => Promise<unknown>) => fn) as never

const readerReturning = (items: unknown[] | 'falla'): (() => CmsReader) => () => ({
  readSingleton: async () => ok({}),
  readCollection: async (key) =>
    items === 'falla' ? err(cmsUnavailable(key, 'HTTP 503')) : ok(items),
})

const publicacion = (titulo: string, fecha: string) => ({
  titulo,
  extracto: `Extracto de ${titulo}`,
  imagen: { url: 'https://cdn.test/a.jpg', alt: `Foto de ${titulo}` },
  fecha,
})

const doce = Array.from({ length: 12 }, (_, index) => {
  const dia = String(index + 1).padStart(2, '0')
  return publicacion(`Día ${dia}`, `2026-10-${dia}`)
})

const withCms = (items: unknown[] | 'falla') => ({
  env: { CMS_URL: 'https://cms.test' },
  cache: passthroughCache,
  createReader: readerReturning(items) as never,
})

describe('loadBlogPage — el listado sale del CMS, y su falla no tumba la página', () => {
  it('sin CMS_URL devuelve la página vacía, no disponible, sin llamar al CMS', async () => {
    const createReader = vi.fn()
    const listing = await loadBlogPage(1, { env: {}, cache: passthroughCache, createReader })
    expect(listing).toEqual({ posts: [], page: 1, pageCount: 1, total: 0, available: false })
    expect(createReader).not.toHaveBeenCalled()
  })

  it('con el CMS caído devuelve la página vacía, no disponible, y no lanza', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    const listing = await loadBlogPage(1, withCms('falla'))
    expect(listing).toMatchObject({ posts: [], available: false })
  })

  it('una lectura fallida rechaza dentro de la función cacheada, así que no se guarda', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    let cachedFn: (() => Promise<unknown>) | undefined
    const cache = ((fn: () => Promise<unknown>) => {
      cachedFn = fn
      return fn
    }) as never
    await loadBlogPage(1, { ...withCms('falla'), cache })
    await expect(cachedFn?.()).rejects.toThrow(/CMS no disponible/)
  })

  it('sin publicaciones la página está vacía pero disponible', async () => {
    expect(await loadBlogPage(1, withCms([]))).toEqual({
      posts: [],
      page: 1,
      pageCount: 1,
      total: 0,
      available: true,
    })
  })

  it('criterios 1 y 3: la primera página trae las 9 más recientes, de la más nueva a la más vieja', async () => {
    const listing = await loadBlogPage(1, withCms(doce))
    expect(listing.posts.map((post) => post.title)).toEqual([
      'Día 12',
      'Día 11',
      'Día 10',
      'Día 09',
      'Día 08',
      'Día 07',
      'Día 06',
      'Día 05',
      'Día 04',
    ])
    expect(listing).toMatchObject({ page: 1, pageCount: 2, total: 12, available: true })
  })

  it('criterio 3: la segunda página trae las que siguen', async () => {
    const listing = await loadBlogPage(2, withCms(doce))
    expect(listing.posts.map((post) => post.title)).toEqual(['Día 03', 'Día 02', 'Día 01'])
    expect(listing.page).toBe(2)
  })

  it('se cachea la colección 10 min con el tag del aviso, sin importar la página pedida', async () => {
    const cache = vi.fn((fn: () => Promise<unknown>) => fn)
    await loadBlogPage(2, {
      env: { CMS_URL: 'https://cms.test/' },
      cache: cache as never,
      createReader: readerReturning(doce) as never,
    })
    expect(cache).toHaveBeenCalledWith(expect.any(Function), ['content', 'posts', 'https://cms.test'], {
      revalidate: LANDING_CACHE_SECONDS,
      tags: [blogCacheTag],
    })
    expect(blogCacheTag).toBe('content:posts')
  })

  it('una publicación descartada por slug repetido deja su advertencia', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const listing = await loadBlogPage(
      1,
      withCms([publicacion('Igual', '2026-01-01'), publicacion('Igual', '2026-02-01')]),
    )
    expect(listing.total).toBe(1)
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('repetido'))
  })
})

describe('loadBlogArticle — US-BLOG-03: una publicación por su slug', () => {
  const conCuerpo = {
    ...publicacion('Cuidados básicos', '2026-10-13'),
    cuerpo: { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Texto completo.' }] }] },
    seoTitulo: 'Cuidados | LASHARY',
  }

  it('criterios 1 y 2: la encuentra con su cuerpo y sus metadatos', async () => {
    const lookup = await loadBlogArticle('cuidados-basicos', withCms([...doce, conCuerpo]))

    expect(lookup.status).toBe('found')
    expect(lookup.article).toMatchObject({
      slug: 'cuidados-basicos',
      title: 'Cuidados básicos',
      seoTitle: 'Cuidados | LASHARY',
      seoDescription: 'Extracto de Cuidados básicos',
    })
    expect(lookup.article?.body[0].inlines[0].text).toBe('Texto completo.')
  })

  it('un slug que el CMS no tiene es not-found, no un error', async () => {
    expect(await loadBlogArticle('no-existe', withCms(doce))).toEqual({ status: 'not-found', article: null })
  })

  it('con el CMS caído es unavailable: no se puede afirmar que la publicación no existe', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(await loadBlogArticle('cuidados-basicos', withCms('falla'))).toEqual({
      status: 'unavailable',
      article: null,
    })
  })

  it('sin CMS_URL es unavailable y no llama al CMS', async () => {
    const createReader = vi.fn()
    const lookup = await loadBlogArticle('x', { env: {}, cache: passthroughCache, createReader })
    expect(lookup.status).toBe('unavailable')
    expect(createReader).not.toHaveBeenCalled()
  })

  it('usa la misma entrada de caché que el listado', async () => {
    const cache = vi.fn((fn: () => Promise<unknown>) => fn)
    await loadBlogArticle('x', { ...withCms(doce), cache: cache as never })
    expect(cache).toHaveBeenCalledWith(expect.any(Function), ['content', 'posts', 'https://cms.test'], {
      revalidate: LANDING_CACHE_SECONDS,
      tags: [blogCacheTag],
    })
  })
})
