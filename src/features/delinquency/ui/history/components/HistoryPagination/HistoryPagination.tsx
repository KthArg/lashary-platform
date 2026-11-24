import Link from 'next/link'
import { HISTORY_PAGE_SIZES } from '@/features/delinquency/domain/case-history'
import { HISTORY_PATH, historyMessages as copy } from '../../constants/history-strings'
import { buildHistoryUrl } from '../../utils/history-url'
import { historyPaginationStyles as STYLES } from './HistoryPagination.styles'
import type { HistoryPaginationProps } from './HistoryPagination.types'

export function HistoryPagination({ query, total }: HistoryPaginationProps) {
  const { filter, page, pageSize } = query
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasPrevious = page > 0
  const hasNext = page + 1 < totalPages

  return (
    <nav aria-label={copy.pagination.navLabel} className={STYLES.nav}>
      <p className={STYLES.status}>
        {copy.pagination.status(page + 1, totalPages)} · {copy.pagination.total(total)}
      </p>
      <div className={STYLES.controls}>
        <form method="get" action={HISTORY_PATH} className={STYLES.sizeForm}>
          <input type="hidden" name="filter" value={filter} />
          <label htmlFor="history-page-size" className={STYLES.sizeLabel}>
            {copy.pagination.sizeLabel}
          </label>
          <select id="history-page-size" name="pageSize" defaultValue={pageSize} className={STYLES.select}>
            {HISTORY_PAGE_SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
          <button type="submit" className={STYLES.button}>
            {copy.pagination.sizeApply}
          </button>
        </form>
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
