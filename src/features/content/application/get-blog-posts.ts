import type { Result } from '@/shared/result'
import {
  BLOG_POSTS_KEY,
  BLOG_SLUG_MAX,
  calendarDate,
  newestFirst,
  slugify,
  type BlogPost,
} from '../domain/blog'
import type { CmsUnavailable } from '../domain/errors'
import { field, image, text } from './cms-values'
import type { CmsReader } from './ports'

export async function readRawBlogPosts(
  reader: CmsReader,
): Promise<Result<unknown[], CmsUnavailable>> {
  return reader.readCollection(BLOG_POSTS_KEY)
}

type Warn = (message: string) => void

// Las publicaciones que el listado puede mostrar, ya ordenadas por fecha descendente
// (docs/contracts/cms-api.md § `posts`). Nunca lanza. Una publicación entra con `titulo`,
// `extracto` e `imagen` válidos; su `slug` sale del campo o, vacío, del título. La que queda
// sin slug y la que repite el de una anterior se descartan con una advertencia.
export function toBlogPosts(
  items: unknown[] | null,
  mediaBaseUrl: string,
  warn: Warn = () => {},
): BlogPost[] {
  if (items === null) return []

  const posts: BlogPost[] = []
  const seen = new Set<string>()
  for (const item of items) {
    const title = text(field(item, 'titulo'), 100)
    const excerpt = text(field(item, 'extracto'), 200)
    const featured = image(field(item, 'imagen'), mediaBaseUrl)
    if (title === null || excerpt === null || featured === null) continue

    const slug = slugify(text(field(item, 'slug'), BLOG_SLUG_MAX) ?? title)
    if (slug === '') {
      warn(`publicación «${title}» sin slug utilizable; se descarta`)
      continue
    }
    if (seen.has(slug)) {
      warn(`slug «${slug}» repetido; se conserva la primera publicación`)
      continue
    }
    seen.add(slug)

    const date = text(field(item, 'fecha'), 10)
    posts.push({
      slug,
      title,
      excerpt,
      image: featured,
      publishedOn: date === null ? null : calendarDate(date),
    })
  }
  return newestFirst(posts)
}
