import Link from 'next/link'
import { ORDERS_ADMIN_PATH, orderHistoryMessages as copy } from '../../constants/order-queue-strings'
import { ordersHistoryPaginationStyles as STYLES } from './OrdersHistoryPagination.styles'
import type { OrdersHistoryPaginationProps } from './OrdersHistoryPagination.types'

export function OrdersHistoryPagination({ page, pageSize, total }: OrdersHistoryPaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasPrevious = page > 0
  const hasNext = page + 1 < totalPages
  const hrefForPage = (nextPage: number) => `${ORDERS_ADMIN_PATH}?tab=historial&page=${nextPage}`

  return (
    <nav aria-label={copy.paginationLabel} className={STYLES.nav}>
      <p className={STYLES.status}>{copy.pageStatus(page + 1, totalPages)}</p>
      <div className={STYLES.controls}>
        {hasPrevious ? (
          <Link className={STYLES.link} href={hrefForPage(page - 1)}>
            {copy.previous}
          </Link>
        ) : (
          <span className={STYLES.linkDisabled} aria-disabled="true">
            {copy.previous}
          </span>
        )}
        {hasNext ? (
          <Link className={STYLES.link} href={hrefForPage(page + 1)}>
            {copy.next}
          </Link>
        ) : (
          <span className={STYLES.linkDisabled} aria-disabled="true">
            {copy.next}
          </span>
        )}
      </div>
    </nav>
  )
}
