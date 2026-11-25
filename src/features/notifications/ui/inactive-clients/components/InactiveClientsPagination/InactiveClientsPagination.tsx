import Link from 'next/link'
import { inactiveClientsMessages as copy } from '../../constants/inactive-clients-strings'
import { inactiveClientsUrl } from '../../utils/inactive-clients-url'
import { inactiveClientsPaginationStyles as STYLES } from './InactiveClientsPagination.styles'
import type { InactiveClientsPaginationProps } from './InactiveClientsPagination.types'

export function InactiveClientsPagination({ rangeDays, page, pageSize, total }: InactiveClientsPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  if (totalPages <= 1) return null

  return (
    <nav aria-label={copy.pagination.label} className={STYLES.nav}>
      {page > 1 && (
        <Link href={inactiveClientsUrl({ rangeDays, page: page - 1 })} className={STYLES.link}>
          {copy.pagination.previous}
        </Link>
      )}
      <span className={STYLES.status}>{copy.pagination.page(page, totalPages)}</span>
      {page < totalPages && (
        <Link href={inactiveClientsUrl({ rangeDays, page: page + 1 })} className={STYLES.link}>
          {copy.pagination.next}
        </Link>
      )}
    </nav>
  )
}
