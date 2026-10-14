import { unstable_cache } from 'next/cache'
import { readRawBlogPosts, toBlogPosts } from '../application/get-blog-posts'
import {
  BLOG_POSTS_KEY,
  articleBySlug,
  pageOf,
  type BlogArticle,
  type BlogPage,
} from '../domain/blog'
import { createCmsReader } from './cms-reader'
import { LANDING_CACHE_SECONDS } from './landing-source'

// El mismo tag que manda el aviso de uno-cms para esta colección.
export const blogCacheTag = `content:${BLOG_POSTS_KEY}`

// `available: false` distingue "no se pudo leer el CMS" de "todavía no hay publicaciones": el
// listado muestra un estado distinto para cada uno (UI-003).
export interface BlogListing extends BlogPage {
  readonly available: boolean
}

// El resultado de buscar una publicación por su slug. `article` solo viene con `found`.
// `not-found` es "el CMS respondió y no la tiene" (un 404); `unavailable`, "no se pudo leer".
export interface BlogArticleLookup {
  readonly status: 'found' | 'not-found' | 'unavailable'
  readonly article: BlogArticle | null
}

interface BlogSourceDeps {
  env?: Record<string, string | undefined>
  cache?: typeof unstable_cache
  createReader?: typeof createCmsReader
}

// Todas las publicaciones válidas, ya ordenadas, o `null` si no se pudo leer el CMS. Nunca
// lanza. Se cachea la colección entera en una sola entrada, que comparten el listado y el
// detalle; validar, ordenar y buscar ocurre en cada lectura.
async function readArticles({
  env = process.env,
  cache = unstable_cache,
  createReader = createCmsReader,
}: BlogSourceDeps): Promise<BlogArticle[] | null> {
  const baseUrl = env.CMS_URL?.trim().replace(/\/+$/, '') ?? ''
  if (baseUrl === '') return null

  const reader = createReader({ baseUrl })
  // Lanzar dentro de la función cacheada es lo que evita guardar una lectura fallida. Publicar,
  // editar o eliminar una publicación manda el aviso con `content:posts`, que expira esta entrada.
  const readCached = cache(
    async () => {
      const result = await readRawBlogPosts(reader)
      if (!result.ok) throw result.error
      return result.value
    },
    ['content', BLOG_POSTS_KEY, baseUrl],
    { revalidate: LANDING_CACHE_SECONDS, tags: [blogCacheTag] },
  )

  try {
    return toBlogPosts(await readCached(), baseUrl, (message) =>
      console.warn(`[content] blog: ${message}`),
    )
  } catch (error) {
    console.warn('[content] blog no disponible', error)
    return null
  }
}

// Una página del listado del blog, lista para renderizar. Sin `CMS_URL`, con el CMS caído o
// con una respuesta que no encaja devuelve la página vacía marcada como no disponible.
export async function loadBlogPage(
  requestedPage: number,
  deps: BlogSourceDeps = {},
): Promise<BlogListing> {
  const articles = await readArticles(deps)
  if (articles === null) return { ...pageOf([], 1), available: false }
  return { ...pageOf(articles, requestedPage), available: true }
}

// Una publicación por su slug, para su página de detalle (US-BLOG-03).
export async function loadBlogArticle(
  slug: string,
  deps: BlogSourceDeps = {},
): Promise<BlogArticleLookup> {
  const articles = await readArticles(deps)
  if (articles === null) return { status: 'unavailable', article: null }

  const article = articleBySlug(articles, slug)
  return article === null ? { status: 'not-found', article: null } : { status: 'found', article }
}
