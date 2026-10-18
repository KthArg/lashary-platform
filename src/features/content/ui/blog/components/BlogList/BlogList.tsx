import Image from 'next/image'
import Link from 'next/link'
import {
  BLOG_ROUTE,
  HOME_ROUTE,
  blogArticleRoute,
  blogMessages,
  blogPageRoute,
} from '../../constants/blog-strings'
import { blogListStyles as STYLES } from './BlogList.styles'
import type { BlogListProps } from './BlogList.types'

const longDate = new Intl.DateTimeFormat('es-CR', { dateStyle: 'long', timeZone: 'UTC' })

const formatDate = (isoDate: string): string => longDate.format(new Date(`${isoDate}T00:00:00Z`))

export function BlogList({ listing }: BlogListProps) {
  const copy = blogMessages
  const { posts, page, pageCount, available } = listing

  return (
    <main className={STYLES.main}>
      <div className={STYLES.inner}>
        <div className={STYLES.heading}>
          <h1 className={STYLES.title}>{copy.title}</h1>
          <span aria-hidden="true" className={STYLES.rule} />
        </div>
        <p className={STYLES.intro}>{copy.intro}</p>

        {!available ? (
          <div role="alert">
            <p className={STYLES.notice}>{copy.unavailable}</p>
            <Link href={BLOG_ROUTE} className={STYLES.action}>
              {copy.retry}
            </Link>
          </div>
        ) : posts.length === 0 ? (
          <div>
            <p className={STYLES.notice}>{copy.empty}</p>
            <Link href={HOME_ROUTE} className={STYLES.action}>
              {copy.emptyAction}
            </Link>
          </div>
        ) : (
          <ol aria-label={copy.listLabel} className={STYLES.list}>
            {posts.map((post, index) => (
              <li key={post.slug}>
                <article className={STYLES.card}>
                  <figure className={STYLES.figure}>
                    <Image
                      src={post.image.url}
                      alt={post.image.alt}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 24rem"
                      preload={index === 0}
                      className={STYLES.photo}
                    />
                  </figure>
                  {post.publishedOn !== null && (
                    <p className={STYLES.date}>
                      <time dateTime={post.publishedOn}>{formatDate(post.publishedOn)}</time>
                    </p>
                  )}
                  <h2 className={STYLES.cardTitle}>
                    <Link href={blogArticleRoute(post.slug)} className={STYLES.cardLink}>
                      {post.title}
                    </Link>
                  </h2>
                  <p className={STYLES.excerpt}>{post.excerpt}</p>
                </article>
              </li>
            ))}
          </ol>
        )}

        {available && pageCount > 1 && (
          <nav aria-label={copy.pagination.label} className={STYLES.pagination}>
            {page > 1 ? (
              <Link href={blogPageRoute(page - 1)} rel="prev" className={STYLES.pageLink}>
                {copy.pagination.newer}
              </Link>
            ) : (
              <span />
            )}
            <p aria-current="page" className={STYLES.pageStatus}>
              {copy.pagination.status(page, pageCount)}
            </p>
            {page < pageCount ? (
              <Link href={blogPageRoute(page + 1)} rel="next" className={STYLES.pageLink}>
                {copy.pagination.older}
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>
    </main>
  )
}
