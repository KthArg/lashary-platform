import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { toRichText } from '../../../application/rich-text'
import type { BlogArticle } from '../../../domain/blog'
import { blogMessages } from '../../constants/blog-strings'
import { BlogArticleNotice, BlogArticleView } from '../components/BlogArticleView'

vi.mock('next/image', () => ({
  default: ({ src, alt, preload }: { src: string; alt: string; preload?: boolean }) => (
    <img src={src} alt={alt} data-preload={preload ? 'si' : 'no'} />
  ),
}))

afterEach(cleanup)

const copy = blogMessages.article

const paragraph = (value: string) => ({ type: 'paragraph', content: [{ type: 'text', text: value }] })

const article = (overrides: Partial<BlogArticle> = {}): BlogArticle => ({
  slug: 'cuidados',
  title: 'Cómo cuidar tus extensiones',
  excerpt: 'Lo que conviene hacer la primera semana.',
  image: { url: 'https://cms.test/destacada.jpg', alt: 'Extensiones recién puestas' },
  publishedOn: '2026-10-13',
  body: toRichText({ type: 'doc', content: [paragraph('Primer párrafo.'), paragraph('Último párrafo.')] }),
  seoTitle: 'Cómo cuidar tus extensiones',
  seoDescription: 'Lo que conviene hacer la primera semana.',
  ...overrides,
})

describe('BlogArticleView — US-BLOG-03', () => {
  it('criterio 1: muestra el título, la imagen destacada y el texto completo', () => {
    render(<BlogArticleView article={article()} />)

    expect(screen.getByRole('heading', { level: 1, name: 'Cómo cuidar tus extensiones' })).toBeTruthy()
    expect(screen.getByAltText('Extensiones recién puestas').getAttribute('src')).toBe(
      'https://cms.test/destacada.jpg',
    )
    // De principio a fin: el primer párrafo del cuerpo y el último.
    expect(screen.getByText('Primer párrafo.')).toBeTruthy()
    expect(screen.getByText('Último párrafo.')).toBeTruthy()
    expect(screen.getByText('13 de octubre de 2026').getAttribute('datetime')).toBe('2026-10-13')
  })

  it('criterio 3: hay navegación de regreso al listado, arriba y abajo', () => {
    render(<BlogArticleView article={article()} />)

    // Cada uno con su nombre: dos regiones iguales no se distinguen con lector de pantalla.
    const navs = [copy.backNav, copy.backNavEnd].map((name) => screen.getByRole('navigation', { name }))
    for (const nav of navs) {
      expect(within(nav).getByRole('link', { name: copy.back }).getAttribute('href')).toBe('/blog')
    }
  })

  it('una publicación sin texto ni fecha se muestra igual, con su título e imagen', () => {
    render(<BlogArticleView article={article({ body: [], publishedOn: null })} />)

    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy()
    expect(screen.getByAltText('Extensiones recién puestas')).toBeTruthy()
    expect(document.querySelector('time')).toBeNull()
  })

  it('PERF-004 y UI-004: la imagen destacada se precarga y hay un solo encabezado principal', () => {
    render(<BlogArticleView article={article()} />)

    expect(screen.getByAltText('Extensiones recién puestas').getAttribute('data-preload')).toBe('si')
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
  })
})

describe('BlogArticleNotice — UI-003: cuando no hay publicación que mostrar', () => {
  it('CMS caído: avisa, ofrece reintentar esa misma dirección y volver al listado', () => {
    render(<BlogArticleNotice kind="unavailable" retryHref="/blog/cuidados" />)

    expect(within(screen.getByRole('alert')).getByText(copy.unavailable)).toBeTruthy()
    expect(screen.getByRole('link', { name: copy.retry }).getAttribute('href')).toBe('/blog/cuidados')
    expect(screen.getByRole('link', { name: copy.back }).getAttribute('href')).toBe('/blog')
  })

  it('no existe: lo dice sin ofrecer reintento, y deja volver al listado', () => {
    render(<BlogArticleNotice kind="not-found" />)

    expect(screen.getByRole('heading', { level: 1, name: copy.notFound.title })).toBeTruthy()
    expect(screen.queryByRole('link', { name: copy.retry })).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
    expect(screen.getByRole('link', { name: copy.back }).getAttribute('href')).toBe('/blog')
  })
})
