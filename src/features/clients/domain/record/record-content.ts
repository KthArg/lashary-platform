import { ok, err, type Result } from '@/shared/result'
import { RECORD_LIMITS } from './record-limits'
import { recordValidationError, type RecordProblem, type RecordValidationError } from './record-errors'
import type { Precaution, RecommendedTechnique, RecordContentInput } from './record.types'

const recordContentBrand: unique symbol = Symbol('RecordContent')

export interface RecordContent extends RecordContentInput {
  readonly [recordContentBrand]: true
}

const hasDuplicates = (values: readonly string[]): boolean => new Set(values).size !== values.length

const precautionKey = (precaution: Precaution): string =>
  `${precaution.categoryId}:${precaution.description.toLowerCase()}`

function normalizeTechnique(technique: RecommendedTechnique | null): RecommendedTechnique | null {
  if (technique === null) return null
  return { id: technique.id, name: technique.name.trim() }
}

function normalizePrecaution(precaution: Precaution): Precaution {
  return {
    id: precaution.id,
    categoryId: precaution.categoryId,
    categoryName: precaution.categoryName.trim(),
    description: precaution.description.trim(),
  }
}

function studyTextProblems(studyText: string): RecordProblem[] {
  if (studyText.length === 0) return ['study-text-empty']
  if (studyText.length > RECORD_LIMITS.studyTextMaxLength) return ['study-text-too-long']
  return []
}

function techniqueProblems(technique: RecommendedTechnique | null): RecordProblem[] {
  if (technique === null) return []
  if (technique.name.length === 0) return ['technique-name-empty']
  if (technique.name.length > RECORD_LIMITS.techniqueNameMaxLength) return ['technique-name-too-long']
  return []
}

function precautionProblems(precautions: readonly Precaution[]): RecordProblem[] {
  const problems: RecordProblem[] = []
  if (precautions.length > RECORD_LIMITS.maxPrecautions) problems.push('too-many-precautions')
  if (precautions.some((precaution) => precaution.categoryName.length === 0)) {
    problems.push('precaution-category-empty')
  }
  if (precautions.some((precaution) => precaution.description.length === 0)) {
    problems.push('precaution-description-empty')
  }
  if (precautions.some((precaution) => precaution.description.length > RECORD_LIMITS.precautionDescriptionMaxLength)) {
    problems.push('precaution-description-too-long')
  }
  const ids = precautions.map((precaution) => precaution.id)
  if (hasDuplicates(ids) || hasDuplicates(precautions.map(precautionKey))) {
    problems.push('duplicate-precaution')
  }
  return problems
}

function imageProblems(images: readonly string[]): RecordProblem[] {
  const problems: RecordProblem[] = []
  if (images.length > RECORD_LIMITS.maxImages) problems.push('too-many-images')
  if (images.some((imagePath) => imagePath.length === 0)) problems.push('image-path-empty')
  if (hasDuplicates(images)) problems.push('duplicate-image')
  return problems
}

export function buildRecordContent(input: RecordContentInput): Result<RecordContent, RecordValidationError> {
  const studyText = input.studyText.trim()
  const recommendedTechnique = normalizeTechnique(input.recommendedTechnique)
  const precautions = input.precautions.map(normalizePrecaution)
  const images = input.images.map((imagePath) => imagePath.trim())

  const problems = [
    ...studyTextProblems(studyText),
    ...techniqueProblems(recommendedTechnique),
    ...precautionProblems(precautions),
    ...imageProblems(images),
  ]
  if (problems.length > 0) return err(recordValidationError(problems))

  return ok({
    [recordContentBrand]: true,
    studyText,
    recommendedTechnique,
    precautions,
    images,
  })
}
