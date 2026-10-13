import { unstable_cache } from 'next/cache'
import { readRawBlogPosts, toBlogPosts } from '../application/get-blog-posts'
import { BLOG_POSTS_KEY, pageOf, type BlogPage } from '../domain/blog'
import { createCmsReader } from './cms-reader'
import { LANDING_CACHE_SECONDS } from './landing-source'

// El mismo tag que manda el aviso de uno-cms para esta colección.
export const blogCacheTag = `content:${BLOG_POSTS_KEY}`

// `available: false` distingue "no se pudo leer el CMS" de "todavía no hay publicaciones": el
// listado muestra un estado distinto para cada uno (UI-003).
export interface BlogListing extends BlogPage {
  readonly available: boolean
}

interface BlogSourceDeps {
  env?: Record<string, string | undefined>
  cache?: typeof unstable_cache
  createReader?: typeof createCmsReader
}

const unavailable = (): BlogListing => ({ ...pageOf([], 1), available: false })

// Una página del listado del blog, lista para renderizar. Nunca lanza: sin `CMS_URL`, con el
// CMS caído o con una respuesta que no encaja devuelve la página vacía marcada como no
// disponible. Se cachea la colección entera; ordenar y cortar la página ocurre en cada lectura.
export async function loadBlogPage(
  requestedPage: number,
  { env = process.env, cache = unstable_cache, createReader = createCmsReader }: BlogSourceDeps = {},
): Promise<BlogListing> {
  const baseUrl = env.CMS_URL?.trim().replace(/\/+$/, '') ?? ''
  if (baseUrl === '') return unavailable()

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
    const posts = toBlogPosts(await readCached(), baseUrl, (message) =>
      console.warn(`[content] blog: ${message}`),
    )
    return { ...pageOf(posts, requestedPage), available: true }
  } catch (error) {
    console.warn('[content] blog no disponible', error)
    return unavailable()
  }
}
