import Link from 'next/link'
import { catalogRoutes } from '../../../routes'
import { packageMessages } from '../../constants/package-strings'
import { packagePaginationStyles as STYLES } from './PackagePagination.styles'
import type { PackagePaginationProps } from './PackagePagination.types'

const paginationMessages = packageMessages.admin.pagination

const pageHref = (page: number) => `${catalogRoutes.packagesAdmin}?page=${page}`

export function PackagePagination({ page, pageSize, total }: PackagePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages === 1) return null

  return (
    <nav aria-label={paginationMessages.label} className={STYLES.nav}>
      {page > 1 ? (
        <Link href={pageHref(page - 1)} className={STYLES.link}>
          {paginationMessages.previous}
        </Link>
      ) : (
        <span className={STYLES.disabled}>{paginationMessages.previous}</span>
      )}
      <span className={STYLES.status}>
        {paginationMessages.page} {page} {paginationMessages.of} {totalPages}
      </span>
      {page < totalPages ? (
        <Link href={pageHref(page + 1)} className={STYLES.link}>
          {paginationMessages.next}
        </Link>
      ) : (
        <span className={STYLES.disabled}>{paginationMessages.next}</span>
      )}
    </nav>
  )
}
