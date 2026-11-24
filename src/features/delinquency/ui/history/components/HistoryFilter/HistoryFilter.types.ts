import type { HistoryFilter } from '@/features/delinquency/domain/case-history'

export interface HistoryFilterProps {
  filter: HistoryFilter
  pageSize: number
}
