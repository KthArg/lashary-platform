import type { Metadata } from 'next'
import { BLOG_PAGE_PARAM, BlogList, blogMessages, getBlogPage } from '@/features/content'
import { requestedPage } from './page.data'

export const metadata: Metadata = {
  title: blogMessages.metadata.title,
  description: blogMessages.metadata.description,
  openGraph: {
    title: blogMessages.metadata.title,
    description: blogMessages.metadata.description,
    locale: 'es_CR',
    type: 'website',
  },
}

interface BlogPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

// La página se arma por petición porque depende de `?pagina=`, pero la lectura del CMS sale de
// la caché de `content` (10 min, o antes con el aviso al publicar). Nunca lanza por el CMS.
export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams
  const listing = await getBlogPage(requestedPage(params[BLOG_PAGE_PARAM]))
  return <BlogList listing={listing} />
}
