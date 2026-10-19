import type { RecommendedTechnique } from '../../../../domain/record/record.types'
import type { StudyFormInput } from '../../types/record-action-results'

export interface StudyFormProps {
  clientId: string
  mode: 'create' | 'edit'
  initial: StudyFormInput
  techniques: readonly RecommendedTechnique[]
  onClose: () => void
}
