import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import type { BlogListing } from '../../../cms/blog-source'
import type { BlogPost } from '../../../domain/blog'
import { blogMessages } from '../../constants/blog-strings'
import { BlogList } from '../components/BlogList'

vi.mock('next/image', () => ({
  default: ({ src, alt, preload }: { src: string; alt: string; preload?: boolean }) => (
    <img src={src} alt={alt} data-preload={preload ? 'si' : 'no'} />
  ),
}))

afterEach(cleanup)

const copy = blogMessages

const post = (title: string, publishedOn: string | null = '2026-10-13'): BlogPost => ({
  slug: title.toLowerCase(),
  title,
  excerpt: `Extracto de ${title}`,
  image: { url: `https://cms.test/${title}.jpg`, alt: `Foto de ${title}` },
  publishedOn,
})

const listing = (overrides: Partial<BlogListing> = {}): BlogListing => ({
  posts: [post('Uno'), post('Dos')],
  page: 1,
  pageCount: 1,
  total: 2,
  available: true,
  ...overrides,
})

const cards = () =>
  within(screen.getByRole('list', { name: copy.listLabel })).getAllByRole('article')
const pagination = () => screen.queryByRole('navigation', { name: copy.pagination.label })

describe('BlogList — US-BLOG-02', () => {
  it('criterio 2: cada tarjeta muestra la imagen, el título y el extracto', () => {
    render(<BlogList listing={listing({ posts: [post('Cuidados')], total: 1 })} />)

    const [card] = cards()
    expect(within(card).getByAltText('Foto de Cuidados').getAttribute('src')).toBe(
      'https://cms.test/Cuidados.jpg',
    )
    expect(within(card).getByRole('heading', { level: 2, name: 'Cuidados' })).toBeTruthy()
    expect(within(card).getByText('Extracto de Cuidados')).toBeTruthy()
  })

  it('criterio 1: las tarjetas salen en el orden en que llega la página', () => {
    render(<BlogList listing={listing({ posts: [post('Reciente'), post('Vieja')] })} />)

    expect(cards().map((card) => within(card).getByRole('heading').textContent)).toEqual([
      'Reciente',
      'Vieja',
    ])
  })

  it('PERF-004: solo la primera imagen se precarga; las demás esperan al lazy-load', () => {
    render(<BlogList listing={listing({ posts: [post('Uno'), post('Dos'), post('Tres')], total: 3 })} />)

    expect(cards().map((card) => within(card).getByRole('img').getAttribute('data-preload'))).toEqual([
      'si',
      'no',
      'no',
    ])
  })

  it('la fecha se muestra en español y no retrocede un día', () => {
    render(<BlogList listing={listing({ posts: [post('Uno', '2026-10-13')], total: 1 })} />)

    const time = screen.getByText('13 de octubre de 2026')
    expect(time.getAttribute('datetime')).toBe('2026-10-13')
  })

  it('una publicación sin fecha se muestra sin ella', () => {
    render(<BlogList listing={listing({ posts: [post('Uno', null)], total: 1 })} />)

    expect(cards()).toHaveLength(1)
    expect(document.querySelector('time')).toBeNull()
  })

  it('criterio 3: con una sola página no hay paginación', () => {
    render(<BlogList listing={listing()} />)

    expect(pagination()).toBeNull()
  })

  it('criterio 3: en la primera de varias páginas solo se puede ir a las más antiguas', () => {
    render(<BlogList listing={listing({ page: 1, pageCount: 3, total: 20 })} />)

    const nav = pagination()!
    expect(within(nav).getByText(copy.pagination.status(1, 3))).toBeTruthy()
    expect(within(nav).getByRole('link', { name: copy.pagination.older }).getAttribute('href')).toBe(
      '/blog?pagina=2',
    )
    expect(within(nav).queryByRole('link', { name: copy.pagination.newer })).toBeNull()
  })

  it('criterio 3: en una página intermedia se puede ir a las dos; la primera no lleva parámetro', () => {
    render(<BlogList listing={listing({ page: 2, pageCount: 3, total: 20 })} />)

    const nav = pagination()!
    expect(within(nav).getByRole('link', { name: copy.pagination.newer }).getAttribute('href')).toBe(
      '/blog',
    )
    expect(within(nav).getByRole('link', { name: copy.pagination.older }).getAttribute('href')).toBe(
      '/blog?pagina=3',
    )
  })

  it('criterio 3: en la última página solo se puede volver a las más recientes', () => {
    render(<BlogList listing={listing({ page: 3, pageCount: 3, total: 20 })} />)

    const nav = pagination()!
    expect(within(nav).getByRole('link', { name: copy.pagination.newer }).getAttribute('href')).toBe(
      '/blog?pagina=2',
    )
    expect(within(nav).queryByRole('link', { name: copy.pagination.older })).toBeNull()
  })

  it('UI-003, vacío: sin publicaciones lo dice y sugiere una acción', () => {
    render(<BlogList listing={listing({ posts: [], total: 0 })} />)

    expect(screen.getByText(copy.empty)).toBeTruthy()
    expect(screen.getByRole('link', { name: copy.emptyAction }).getAttribute('href')).toBe('/')
    expect(screen.queryByRole('list', { name: copy.listLabel })).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('UI-003, error: con el CMS caído avisa y ofrece reintentar, no dice que está vacío', () => {
    render(<BlogList listing={listing({ posts: [], total: 0, available: false })} />)

    const alert = screen.getByRole('alert')
    expect(within(alert).getByText(copy.unavailable)).toBeTruthy()
    expect(within(alert).getByRole('link', { name: copy.retry }).getAttribute('href')).toBe('/blog')
    expect(screen.queryByText(copy.empty)).toBeNull()
  })

  it('UI-004: la página tiene un solo encabezado principal', () => {
    render(<BlogList listing={listing()} />)

    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual([
      copy.title,
    ])
  })
})
