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

export const blogCacheTag = `content:${BLOG_POSTS_KEY}`

export interface BlogListing extends BlogPage {
  readonly available: boolean
}

export interface BlogArticleLookup {
  readonly status: 'found' | 'not-found' | 'unavailable'
  readonly article: BlogArticle | null
}

interface BlogSourceDeps {
  env?: Record<string, string | undefined>
  cache?: typeof unstable_cache
  createReader?: typeof createCmsReader
}

async function readArticles({
  env = process.env,
  cache = unstable_cache,
  createReader = createCmsReader,
}: BlogSourceDeps): Promise<BlogArticle[] | null> {
  const baseUrl = env.CMS_URL?.trim().replace(/\/+$/, '') ?? ''
  if (baseUrl === '') return null

  const reader = createReader({ baseUrl })
  const readCached = cache(
    async () => {
      const result = await readRawBlogPosts(reader)
      if (!result.ok) throw new Error(result.error.message)
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

export async function loadBlogPage(
  requestedPage: number,
  deps: BlogSourceDeps = {},
): Promise<BlogListing> {
  const articles = await readArticles(deps)
  if (articles === null) return { ...pageOf([], 1), available: false }
  return { ...pageOf(articles, requestedPage), available: true }
}

export async function loadBlogArticle(
  slug: string,
  deps: BlogSourceDeps = {},
): Promise<BlogArticleLookup> {
  const articles = await readArticles(deps)
  if (articles === null) return { status: 'unavailable', article: null }

  const article = articleBySlug(articles, slug)
  return article === null ? { status: 'not-found', article: null } : { status: 'found', article }
}
