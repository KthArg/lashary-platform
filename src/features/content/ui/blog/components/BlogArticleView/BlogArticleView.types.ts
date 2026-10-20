import type { BlogArticle } from '../../../../domain/blog'

export interface BlogArticleViewProps {
  article: BlogArticle
}

export interface BlogArticleNoticeProps {
  kind: 'unavailable' | 'not-found'
  retryHref?: string
}
