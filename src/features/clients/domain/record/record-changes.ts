import { ok, err, isErr, type Result } from '@/shared/result'
import { buildRecordContent, type RecordContent } from './record-content'
import {
  precautionNotFound,
  recordUnchanged,
  type PrecautionNotFound,
  type RecordUnchanged,
  type RecordValidationError,
} from './record-errors'
import type { Precaution, RecordChangeKind, RecordContentInput, RecordStudy } from './record.types'

export interface RecordChange {
  readonly changeKind: RecordChangeKind
  readonly content: RecordContent
}

const contentInput = (content: RecordContent): RecordContentInput => ({
  studyText: content.studyText,
  recommendedTechnique: content.recommendedTechnique,
  precautions: content.precautions,
  images: content.images,
})

function changeTo(
  changeKind: RecordChangeKind,
  input: RecordContentInput,
): Result<RecordChange, RecordValidationError> {
  const content = buildRecordContent(input)
  if (isErr(content)) return content
  return ok({ changeKind, content: content.value })
}

const sameStudy = (before: RecordStudy, after: RecordStudy): boolean =>
  before.studyText === after.studyText &&
  before.recommendedTechnique?.id === after.recommendedTechnique?.id &&
  before.recommendedTechnique?.name === after.recommendedTechnique?.name

export function createInitialRecord(input: RecordContentInput): Result<RecordChange, RecordValidationError> {
  return changeTo('initial', input)
}

export function addPrecaution(
  current: RecordContent,
  precaution: Precaution,
): Result<RecordChange, RecordValidationError> {
  return changeTo('precaution_added', {
    ...contentInput(current),
    precautions: [...current.precautions, precaution],
  })
}

export function removePrecaution(
  current: RecordContent,
  precautionId: string,
): Result<RecordChange, RecordValidationError | PrecautionNotFound> {
  const remaining = current.precautions.filter((precaution) => precaution.id !== precautionId)
  if (remaining.length === current.precautions.length) return err(precautionNotFound(precautionId))
  return changeTo('precaution_removed', { ...contentInput(current), precautions: remaining })
}

export function editStudy(
  current: RecordContent,
  study: RecordStudy,
): Result<RecordChange, RecordValidationError | RecordUnchanged> {
  const change = changeTo('study_edited', { ...contentInput(current), ...study })
  if (isErr(change)) return change
  if (sameStudy(current, change.value.content)) return err(recordUnchanged())
  return change
}

export function addImage(
  current: RecordContent,
  imagePath: string,
): Result<RecordChange, RecordValidationError> {
  return changeTo('image_added', { ...contentInput(current), images: [...current.images, imagePath] })
}
