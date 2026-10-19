import type { Precaution, RecommendedTechnique, RecordChangeKind } from '../../../domain/record/record.types'

export interface RecordVersionView {
  readonly id: string
  readonly previousVersionId: string | null
  readonly changeKind: RecordChangeKind
  readonly studyText: string
  readonly recommendedTechnique: RecommendedTechnique | null
  readonly precautions: readonly Precaution[]
  readonly images: readonly string[]
  readonly createdBy: string
  readonly createdAt: string
}

export type ViewRecordResult =
  | { ok: true; current: RecordVersionView | null; history: RecordVersionView[]; imageUrls: Record<string, string> }
  | { ok: false; error: string }

export type SaveRecordResult =
  | { ok: true; version: RecordVersionView }
  | { ok: false; error: string; problems: string[] }

export interface StudyFormInput {
  studyText: string
  recommendedTechniqueId: string | null
}

export interface PrecautionFormInput {
  categoryId: string
  description: string
}

export type ListTechniqueOptionsResult =
  | { ok: true; techniques: RecommendedTechnique[] }
  | { ok: false; error: string }

export interface CategoryOption {
  readonly id: string
  readonly name: string
}

export type ListCategoryOptionsResult =
  | { ok: true; categories: CategoryOption[] }
  | { ok: false; error: string }
