import Link from 'next/link'
import { historyMessages as copy } from '../../constants/history-strings'
import { buildHistoryUrl } from '../../utils/history-url'
import { HistoryPageSize } from '../HistoryPageSize'
import { historyPaginationStyles as STYLES } from './HistoryPagination.styles'
import type { HistoryPaginationProps } from './HistoryPagination.types'

export function HistoryPagination({ query, total }: HistoryPaginationProps) {
  const { page, pageSize } = query
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasPrevious = page > 0
  const hasNext = page + 1 < totalPages

  return (
    <nav aria-label={copy.pagination.navLabel} className={STYLES.nav}>
      <p className={STYLES.status}>
        {copy.pagination.status(page + 1, totalPages)} · {copy.pagination.total(total)}
      </p>
      <div className={STYLES.controls}>
        <HistoryPageSize query={query} />
        {hasPrevious ? (
          <Link href={buildHistoryUrl({ ...query, page: page - 1 })} className={STYLES.link}>
            {copy.pagination.previous}
          </Link>
        ) : (
          <span aria-disabled="true" className={STYLES.linkDisabled}>
            {copy.pagination.previous}
          </span>
        )}
        {hasNext ? (
          <Link href={buildHistoryUrl({ ...query, page: page + 1 })} className={STYLES.link}>
            {copy.pagination.next}
          </Link>
        ) : (
          <span aria-disabled="true" className={STYLES.linkDisabled}>
            {copy.pagination.next}
          </span>
        )}
      </div>
    </nav>
  )
}
