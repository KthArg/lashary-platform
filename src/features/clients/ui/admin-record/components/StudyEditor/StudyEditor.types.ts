import type { RecordStudy, RecommendedTechnique } from '../../../../domain/record/record.types'

export interface StudyEditorProps {
  clientId: string
  study: RecordStudy | null
  techniques: readonly RecommendedTechnique[]
}
