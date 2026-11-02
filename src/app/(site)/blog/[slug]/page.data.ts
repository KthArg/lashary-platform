import type { Metadata } from 'next'
import { blogMessages, type BlogArticleLookup } from '@/features/content'

export function articleMetadata({ article }: BlogArticleLookup): Metadata {
  if (article === null) {
    return {
      title: blogMessages.metadata.title,
      description: blogMessages.metadata.description,
      robots: { index: false },
    }
  }

  return {
    title: article.seoTitle,
    description: article.seoDescription,
    openGraph: {
      title: article.seoTitle,
      description: article.seoDescription,
      locale: 'es_CR',
      type: 'article',
      images: [{ url: article.image.url, alt: article.image.alt }],
      ...(article.publishedOn !== null ? { publishedTime: article.publishedOn } : {}),
    },
  }
}
