import type { RecordStudy, RecommendedTechnique } from '@/features/clients/domain/record/record.types'

export interface StudyEditorProps {
  clientId: string
  study: RecordStudy | null
  techniques: readonly RecommendedTechnique[]
}
