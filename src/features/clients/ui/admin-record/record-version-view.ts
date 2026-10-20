import type { RecordVersion } from '../../application/record/record-ports'
import type { RecordVersionView } from './types/record-action-results'

export function toVersionView(version: RecordVersion): RecordVersionView {
  const { content } = version
  return {
    id: version.id,
    previousVersionId: version.previousVersionId,
    changeKind: version.changeKind,
    studyText: content.studyText,
    recommendedTechnique: content.recommendedTechnique,
    precautions: content.precautions.map((precaution) => ({ ...precaution })),
    images: [...content.images],
    createdBy: version.createdBy,
    createdAt: version.createdAt.toISOString(),
  }
}
