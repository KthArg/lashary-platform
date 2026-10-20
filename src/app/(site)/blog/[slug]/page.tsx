import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import {
  BlogArticleNotice,
  BlogArticleView,
  blogArticleRoute,
  getBlogArticle,
} from '@/features/content'
import { articleMetadata } from './page.data'

interface BlogArticlePageProps {
  params: Promise<{ slug: string }>
}

// La lectura sale de la caché de `content`, la misma entrada que usa el listado, así que
// pedirla aquí y en la página no llama dos veces al CMS.
export async function generateMetadata({ params }: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  return articleMetadata(await getBlogArticle(slug))
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = await params
  const lookup = await getBlogArticle(slug)

  // El CMS respondió y no la tiene: se sirve `not-found.tsx`. Como la ruta transmite (tiene
  // `loading.tsx`), Next responde 200 con `noindex` en vez de un 404 de HTTP.
  if (lookup.status === 'not-found') notFound()
  // No se pudo leer el CMS: no se puede afirmar que no existe, así que no es un 404.
  if (lookup.article === null) {
    return <BlogArticleNotice kind="unavailable" retryHref={blogArticleRoute(slug)} />
  }
  return <BlogArticleView article={lookup.article} />
}
