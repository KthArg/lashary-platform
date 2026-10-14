import type { BlogArticle } from '../../../../domain/blog'

export interface BlogArticleViewProps {
  article: BlogArticle
}

export interface BlogArticleNoticeProps {
  // `unavailable`: no se pudo leer el CMS. `not-found`: el CMS no tiene esa publicación.
  kind: 'unavailable' | 'not-found'
  // A dónde lleva "Volver a intentar"; solo se usa con `unavailable`.
  retryHref?: string
}
