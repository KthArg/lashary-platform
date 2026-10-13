import type { CmsImage } from './landing-content'
import type { RichTextBlock } from './rich-text'

// Las publicaciones del blog (docs/contracts/cms-api.md v1.6, colección `posts`).
export const BLOG_POSTS_KEY = 'posts'

// El límite configurado del listado (US-BLOG-02, criterio 3; PERF-002).
export const BLOG_PAGE_SIZE = 9

export const BLOG_SLUG_MAX = 80

// Lo que el listado muestra de una publicación. `publishedOn` es `AAAA-MM-DD`, o `null` cuando
// el CMS trae una fecha que no se puede leer: esa publicación va al final.
export interface BlogPost {
  readonly slug: string
  readonly title: string
  readonly excerpt: string
  readonly image: CmsImage
  readonly publishedOn: string | null
}

// La publicación completa, para su página de detalle (US-BLOG-03). `seoTitle` y
// `seoDescription` ya traen el título y el extracto cuando el CMS no los llenó.
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

// La identidad de ruta de una publicación: minúsculas, sin diacríticos, cada tramo fuera de
// `a-z0-9` pasa a un guion, sin guiones en los extremos, recortado a 80. Puede quedar vacía.
export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(DIACRITICS, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .slice(0, BLOG_SLUG_MAX)
    .replace(/^-+|-+$/g, '')
}

// Una fecha de calendario real en `AAAA-MM-DD`; `2026-02-30` no lo es.
export function calendarDate(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (match === null) return null
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])]
  if (month < 1 || month > 12) return null
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
  const daysInMonth = [31, isLeap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1]
  return day >= 1 && day <= daysInMonth ? value : null
}

// Fecha descendente; las que no tienen fecha, al final. `sort` es estable, así que dos
// publicaciones con la misma fecha conservan el orden del editor.
export function newestFirst<P extends BlogPost>(posts: readonly P[]): P[] {
  return [...posts].sort((a, b) => {
    if (a.publishedOn === b.publishedOn) return 0
    if (a.publishedOn === null) return 1
    if (b.publishedOn === null) return -1
    return a.publishedOn < b.publishedOn ? 1 : -1
  })
}

// La publicación de ese slug, o `null`. El slug llega de la dirección: se compara tal cual,
// sin normalizarlo, para que cada publicación tenga una sola dirección.
export function articleBySlug<A extends BlogPost>(articles: readonly A[], slug: string): A | null {
  return articles.find((article) => article.slug === slug) ?? null
}

// Una página del listado. Un número de página que no existe cae en la más cercana que sí: la
// página pública nunca falla por una dirección mal escrita.
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
