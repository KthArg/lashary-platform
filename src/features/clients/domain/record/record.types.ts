export type RecordChangeKind =
  | 'initial'
  | 'precaution_added'
  | 'precaution_removed'
  | 'study_edited'
  | 'image_added'

export interface Precaution {
  readonly id: string
  readonly categoryId: string
  readonly categoryName: string
  readonly description: string
}

export interface RecommendedTechnique {
  readonly id: string
  readonly name: string
}

export interface RecordStudy {
  readonly studyText: string
  readonly recommendedTechnique: RecommendedTechnique | null
}

export interface RecordContentInput extends RecordStudy {
  readonly precautions: readonly Precaution[]
  readonly images: readonly string[]
}
