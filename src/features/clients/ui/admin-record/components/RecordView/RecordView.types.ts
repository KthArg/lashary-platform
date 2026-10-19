import type { RecordVersionView } from '../../types/record-action-results'

export interface RecordViewProps {
  current: RecordVersionView | null
  history: readonly RecordVersionView[]
}
