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

export async function generateMetadata({ params }: BlogArticlePageProps): Promise<Metadata> {
  const { slug } = await params
  return articleMetadata(await getBlogArticle(slug))
}

export default async function BlogArticlePage({ params }: BlogArticlePageProps) {
  const { slug } = await params
  const lookup = await getBlogArticle(slug)

  // La ruta transmite (loading.tsx): Next responde 200 con noindex, no un 404 HTTP
  if (lookup.status === 'not-found') notFound()
  // CMS caído: no se afirma que no existe
  if (lookup.article === null) {
    return <BlogArticleNotice kind="unavailable" retryHref={blogArticleRoute(slug)} />
  }
  return <BlogArticleView article={lookup.article} />
}
