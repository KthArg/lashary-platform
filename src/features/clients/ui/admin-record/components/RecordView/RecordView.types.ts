import type { RecommendedTechnique } from '../../../../domain/record/record.types'
import type { CategoryOption, RecordVersionView } from '../../types/record-action-results'

export interface RecordViewProps {
  clientId: string
  current: RecordVersionView | null
  history: readonly RecordVersionView[]
  initial: RecordVersionView | null
  techniques: readonly RecommendedTechnique[]
  categories: readonly CategoryOption[]
  imageUrls: Readonly<Record<string, string>>
}
