import type { RecommendedTechnique } from '../../../../domain/record/record.types'
import type { RecordVersionView } from '../../types/record-action-results'

export interface RecordViewProps {
  clientId: string
  current: RecordVersionView | null
  history: readonly RecordVersionView[]
  techniques: readonly RecommendedTechnique[]
}
