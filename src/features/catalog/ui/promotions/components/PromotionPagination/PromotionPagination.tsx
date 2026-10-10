import Link from 'next/link'
import { catalogRoutes } from '../../../routes'
import { promotionMessages } from '../../constants/promotion-strings'
import { promotionPaginationStyles as STYLES } from './PromotionPagination.styles'
import type { PromotionPaginationProps } from './PromotionPagination.types'

const paginationMessages = promotionMessages.admin.pagination

const pageHref = (page: number) => `${catalogRoutes.promotionsAdmin}?page=${page}`

export function PromotionPagination({ page, pageSize, total }: PromotionPaginationProps) {
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
