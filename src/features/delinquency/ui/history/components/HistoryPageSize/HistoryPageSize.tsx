'use client'

import { useRouter } from 'next/navigation'
import { HISTORY_PAGE_SIZES } from '@/features/delinquency/domain/case-history'
import { historyMessages as copy } from '../../constants/history-strings'
import { buildHistoryUrl } from '../../utils/history-url'
import { historyPageSizeStyles as STYLES } from './HistoryPageSize.styles'
import type { HistoryPageSizeProps } from './HistoryPageSize.types'

export function HistoryPageSize({ query }: HistoryPageSizeProps) {
  const router = useRouter()

  const changePageSize = (pageSize: number) => router.push(buildHistoryUrl({ ...query, pageSize, page: 0 }))

  return (
    <div className={STYLES.field}>
      <label htmlFor="history-page-size" className={STYLES.label}>
        {copy.pagination.sizeLabel}
      </label>
      <select
        id="history-page-size"
        value={query.pageSize}
        onChange={(event) => changePageSize(Number(event.target.value))}
        className={STYLES.select}
      >
        {HISTORY_PAGE_SIZES.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
    </div>
  )
}
