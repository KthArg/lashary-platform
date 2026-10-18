import type { CmsImage } from './landing-content'
import type { RichTextBlock } from './rich-text'

export const BLOG_POSTS_KEY = 'posts'

export const BLOG_PAGE_SIZE = 9

export const BLOG_SLUG_MAX = 80

export interface BlogPost {
  readonly slug: string
  readonly title: string
  readonly excerpt: string
  readonly image: CmsImage
  readonly publishedOn: string | null
}

export interface BlogArticle extends BlogPost {
  readonly body: readonly RichTextBlock[]
  readonly seoTitle: string
  readonly seoDescription: string
}

export interface BlogPage {
  readonly posts: readonly BlogPost[]
  readonly page: number
  readonly pageCount: number
  readonly total: number
}

const DIACRITICS = /[\u0300-\u036f]/g

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, BLOG_SLUG_MAX)
    .replace(/^-+|-+$/g, '')
}

export function calendarDate(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (match === null) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  if (month < 1 || month > 12) return null
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
  return day >= 1 && day <= daysInMonth ? value : null
}

export function newestFirst<P extends BlogPost>(posts: readonly P[]): P[] {
  return [...posts].sort((a, b) => {
    if (a.publishedOn === b.publishedOn) return 0
    if (a.publishedOn === null) return 1
    if (b.publishedOn === null) return -1
    return a.publishedOn < b.publishedOn ? 1 : -1
  })
}

export function articleBySlug<A extends BlogPost>(articles: readonly A[], slug: string): A | null {
  return articles.find((article) => article.slug === slug) ?? null
}

export function pageOf(
  posts: readonly BlogPost[],
  requested: number,
  size: number = BLOG_PAGE_SIZE,
): BlogPage {
  const pageCount = Math.max(1, Math.ceil(posts.length / size))
  const page = Number.isInteger(requested) ? Math.min(Math.max(requested, 1), pageCount) : 1
  const start = (page - 1) * size
  return { posts: posts.slice(start, start + size), page, pageCount, total: posts.length }
}
