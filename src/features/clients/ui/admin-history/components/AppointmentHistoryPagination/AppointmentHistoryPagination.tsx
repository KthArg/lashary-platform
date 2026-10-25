import Link from 'next/link'
import { HISTORY_PAGINATION_TEXTS } from '../../constants/history-strings'
import { appointmentHistoryUrl } from '../../appointment-history-url'
import { appointmentHistoryPaginationStyles as STYLES } from './AppointmentHistoryPagination.styles'
import type { AppointmentHistoryPaginationProps } from './AppointmentHistoryPagination.types'

export function AppointmentHistoryPagination({ clientId, page, pageSize, total }: AppointmentHistoryPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasPrevious = page > 0
  const hasNext = page + 1 < totalPages

  return (
    <nav aria-label={HISTORY_PAGINATION_TEXTS.navLabel} className={STYLES.nav}>
      <p className={STYLES.status}>
        {HISTORY_PAGINATION_TEXTS.pageStatus(page + 1, totalPages)} · {HISTORY_PAGINATION_TEXTS.totalCount(total)}
      </p>
      <div className={STYLES.controls}>
        {hasPrevious ? (
          <Link className={STYLES.link} href={appointmentHistoryUrl(clientId, page - 1)}>{HISTORY_PAGINATION_TEXTS.previous}</Link>
        ) : (
          <span className={STYLES.linkDisabled} aria-disabled="true">{HISTORY_PAGINATION_TEXTS.previous}</span>
        )}
        {hasNext ? (
          <Link className={STYLES.link} href={appointmentHistoryUrl(clientId, page + 1)}>{HISTORY_PAGINATION_TEXTS.next}</Link>
        ) : (
          <span className={STYLES.linkDisabled} aria-disabled="true">{HISTORY_PAGINATION_TEXTS.next}</span>
        )}
      </div>
    </nav>
  )
}
