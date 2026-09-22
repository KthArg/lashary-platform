'use client'

import Link from 'next/link'
import { useClientsListQuery } from '../../hooks/useClientsListQuery'
import { CLIENTS_PAGINATION_TEXTS } from '../../constants/clients-strings'
import { CLIENTS_LIST_LIMITS } from '../../constants/client-form'
import { clientsPaginationStyles as STYLES } from './ClientsPagination.styles'
import type { ClientsPaginationProps } from './ClientsPagination.types'

export function ClientsPagination({ page, pageSize, total }: ClientsPaginationProps) {
  const { urlWith, navigateWith } = useClientsListQuery()

  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const hasPrevious = page > 0
  const hasNext = page + 1 < totalPages

  const hrefForPage = (nextPage: number) => urlWith({ page: nextPage })

  const changePageSize = (nextPageSize: number) => navigateWith({ pageSize: nextPageSize, page: null })

  return (
    <nav aria-label={CLIENTS_PAGINATION_TEXTS.navLabel} className={STYLES.nav}>
      <p className={STYLES.status}>
        {CLIENTS_PAGINATION_TEXTS.pageStatus(page + 1, totalPages)} · {CLIENTS_PAGINATION_TEXTS.totalCount(total)}
      </p>
      <div className={STYLES.controls}>
        <label className={STYLES.sizeLabel} htmlFor="clients-page-size">
          {CLIENTS_PAGINATION_TEXTS.pageSizeLabel}
        </label>
        <select
          id="clients-page-size"
          className={STYLES.sizeSelect}
          value={pageSize}
          onChange={(event) => changePageSize(Number(event.target.value))}
        >
          {CLIENTS_LIST_LIMITS.pageSizes.map((size) => (
            <option key={size} value={size}>{size}</option>
          ))}
        </select>
        {hasPrevious ? (
          <Link className={STYLES.link} href={hrefForPage(page - 1)}>{CLIENTS_PAGINATION_TEXTS.previous}</Link>
        ) : (
          <span className={STYLES.linkDisabled} aria-disabled="true">{CLIENTS_PAGINATION_TEXTS.previous}</span>
        )}
        {hasNext ? (
          <Link className={STYLES.link} href={hrefForPage(page + 1)}>{CLIENTS_PAGINATION_TEXTS.next}</Link>
        ) : (
          <span className={STYLES.linkDisabled} aria-disabled="true">{CLIENTS_PAGINATION_TEXTS.next}</span>
        )}
      </div>
    </nav>
  )
}
