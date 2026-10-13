import Image from 'next/image'
import Link from 'next/link'
import { BLOG_ROUTE, blogMessages } from '../../../constants/blog-strings'
import { RichText } from '../RichText'
import { blogArticleStyles as STYLES } from './BlogArticleView.styles'
import type { BlogArticleNoticeProps, BlogArticleViewProps } from './BlogArticleView.types'

const longDate = new Intl.DateTimeFormat('es-CR', { dateStyle: 'long', timeZone: 'UTC' })

const formatDate = (isoDate: string): string => longDate.format(new Date(`${isoDate}T00:00:00Z`))

function BackLink({ className }: { className: string }) {
  const copy = blogMessages.article
  return (
    <nav aria-label={copy.backNav} className={className}>
      <Link href={BLOG_ROUTE} className={STYLES.back}>
        {copy.back}
      </Link>
    </nav>
  )
}

export function BlogArticleView({ article }: BlogArticleViewProps) {
  return (
    <main className={STYLES.main}>
      <article className={STYLES.inner}>
        <BackLink className={STYLES.backTop} />

        {article.publishedOn !== null && (
          <p className={STYLES.date}>
            <time dateTime={article.publishedOn}>{formatDate(article.publishedOn)}</time>
          </p>
        )}
        <h1 className={STYLES.title}>{article.title}</h1>
        <p className={STYLES.excerpt}>{article.excerpt}</p>

        <figure className={STYLES.figure}>
          <Image
            src={article.image.url}
            alt={article.image.alt}
            fill
            sizes="(max-width: 928px) 100vw, 55rem"
            // La imagen destacada es el elemento más grande de la primera pantalla.
            preload
            className={STYLES.photo}
          />
        </figure>

        <RichText blocks={article.body} />

        <BackLink className={STYLES.backBottom} />
      </article>
    </main>
  )
}

// Lo que se muestra en lugar de la publicación cuando no se pudo leer o no existe. En los dos
// casos queda el camino de regreso al listado.
export function BlogArticleNotice({ kind, retryHref }: BlogArticleNoticeProps) {
  const copy = blogMessages.article
  return (
    <main className={STYLES.main}>
      <div className={STYLES.inner}>
        {kind === 'unavailable' ? (
          <div role="alert">
            <p className={STYLES.notice}>{copy.unavailable}</p>
          </div>
        ) : (
          <>
            <h1 className={STYLES.noticeTitle}>{copy.notFound.title}</h1>
            <p className={STYLES.notice}>{copy.notFound.body}</p>
          </>
        )}
        <div className={STYLES.actions}>
          {kind === 'unavailable' && retryHref && (
            <Link href={retryHref} className={STYLES.action}>
              {copy.retry}
            </Link>
          )}
          <Link href={BLOG_ROUTE} className={STYLES.action}>
            {copy.back}
          </Link>
        </div>
      </div>
    </main>
  )
}
