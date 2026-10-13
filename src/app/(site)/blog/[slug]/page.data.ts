import type { Metadata } from 'next'
import { blogMessages, type BlogArticleLookup } from '@/features/content'

// Los metadatos de la página de una publicación (US-BLOG-03, criterio 2). Sin publicación que
// describir (no existe, o no se pudo leer el CMS) quedan los del blog, y los buscadores no la
// indexan: no hay contenido propio que mostrar.
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
