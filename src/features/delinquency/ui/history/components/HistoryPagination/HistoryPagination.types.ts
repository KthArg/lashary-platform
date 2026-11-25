import type { HistoryQuery } from '@/features/delinquency/domain/case-history'

export interface HistoryPaginationProps {
  query: HistoryQuery
  total: number
}
