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

export default async function BlogPage({ searchParams }: BlogPageProps) {
  const params = await searchParams
  const listing = await getBlogPage(requestedPage(params[BLOG_PAGE_PARAM]))
  return <BlogList listing={listing} />
}
