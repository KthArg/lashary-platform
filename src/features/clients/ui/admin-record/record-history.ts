import { STUDIO_TIME_ZONE } from '@/shared/studio-time'
import { RECORD_CHANGE_TEXTS } from './constants/record-strings'
import type { Precaution } from '../../domain/record/record.types'
import type { RecordVersionView } from './types/record-action-results'

const RECORD_DATE_FORMAT = new Intl.DateTimeFormat('es-CR', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: STUDIO_TIME_ZONE,
})

export const formatRecordDate = (isoDate: string): string => RECORD_DATE_FORMAT.format(new Date(isoDate))

const missingFrom = (precautions: readonly Precaution[], others: readonly Precaution[]): Precaution | undefined =>
  precautions.find((precaution) => !others.some((other) => other.id === precaution.id))

export function describeVersion(version: RecordVersionView, previous: RecordVersionView | undefined): string {
  switch (version.changeKind) {
    case 'initial':
      return RECORD_CHANGE_TEXTS.initial
    case 'study_edited':
      return RECORD_CHANGE_TEXTS.studyEdited
    case 'image_added':
      return RECORD_CHANGE_TEXTS.imageAdded
    case 'precaution_added': {
      const added = previous ? missingFrom(version.precautions, previous.precautions) : version.precautions.at(-1)
      if (!added) return RECORD_CHANGE_TEXTS.somePrecautionAdded
      return RECORD_CHANGE_TEXTS.precautionAdded(added.categoryName, added.description)
    }
    case 'precaution_removed': {
      const removed = previous ? missingFrom(previous.precautions, version.precautions) : undefined
      if (!removed) return RECORD_CHANGE_TEXTS.somePrecautionRemoved
      return RECORD_CHANGE_TEXTS.precautionRemoved(removed.categoryName, removed.description)
    }
  }
}
