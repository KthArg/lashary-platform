import { describe, it, expect } from 'vitest'
import type { BlogArticle } from '@/features/content'
import { blogMessages } from '@/features/content/client'
import { articleMetadata } from './page.data'

const article: BlogArticle = {
  slug: 'cuidados',
  title: 'Cómo cuidar tus extensiones',
  excerpt: 'Lo que conviene hacer la primera semana.',
  image: { url: 'https://cdn.test/destacada.jpg', alt: 'Extensiones recién puestas' },
  publishedOn: '2026-10-13',
  body: [],
  seoTitle: 'Cuidados de extensiones | LASHARY',
  seoDescription: 'Guía corta para la primera semana.',
}

describe('articleMetadata — US-BLOG-03, criterio 2: metadatos básicos de SEO', () => {
  it('título y descripción salen de los campos de SEO de la publicación', () => {
    const metadata = articleMetadata({ status: 'found', article })

    expect(metadata.title).toBe('Cuidados de extensiones | LASHARY')
    expect(metadata.description).toBe('Guía corta para la primera semana.')
    expect(metadata.robots).toBeUndefined()
  })

  it('para redes: mismo título y descripción, tipo artículo, la imagen destacada y la fecha', () => {
    const { openGraph } = articleMetadata({ status: 'found', article })

    expect(openGraph).toMatchObject({
      title: 'Cuidados de extensiones | LASHARY',
      description: 'Guía corta para la primera semana.',
      type: 'article',
      locale: 'es_CR',
      images: [{ url: 'https://cdn.test/destacada.jpg', alt: 'Extensiones recién puestas' }],
      publishedTime: '2026-10-13',
    })
  })

  it('sin fecha legible no inventa una', () => {
    const { openGraph } = articleMetadata({ status: 'found', article: { ...article, publishedOn: null } })

    expect(openGraph).not.toHaveProperty('publishedTime')
  })

  it('sin publicación quedan los metadatos del blog y no se indexa', () => {
    for (const status of ['not-found', 'unavailable'] as const) {
      expect(articleMetadata({ status, article: null })).toEqual({
        title: blogMessages.metadata.title,
        description: blogMessages.metadata.description,
        robots: { index: false },
      })
    }
  })
})
