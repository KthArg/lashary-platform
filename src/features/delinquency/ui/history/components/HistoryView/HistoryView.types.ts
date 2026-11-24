import type { HistoryQuery } from '@/features/delinquency/domain/case-history'
import type { HistoryViewModel } from '../../services/history-service'

export interface HistoryViewProps {
  model: HistoryViewModel
  query: HistoryQuery
}
