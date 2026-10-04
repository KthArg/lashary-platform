import Link from 'next/link'
import { catalogRoutes } from '../../../routes'
import { packageMessages } from '../../constants/package-strings'
import { packagePaginationStyles as STYLES } from './PackagePagination.styles'
import type { PackagePaginationProps } from './PackagePagination.types'

const m = packageMessages.admin.pagination

const pageHref = (page: number) => `${catalogRoutes.packagesAdmin}?page=${page}`

export function PackagePagination({ page, pageSize, total }: PackagePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages === 1) return null

  return (
    <nav aria-label={m.label} className={STYLES.nav}>
      {page > 1 ? (
        <Link href={pageHref(page - 1)} className={STYLES.link}>
          {m.previous}
        </Link>
      ) : (
        <span className={STYLES.disabled}>{m.previous}</span>
      )}
      <span className={STYLES.status}>
        {m.page} {page} {m.of} {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={pageHref(page + 1)} className={STYLES.link}>
          {m.next}
        </Link>
      ) : (
        <span className={STYLES.disabled}>{m.next}</span>
      )}
    </nav>
  )
}
