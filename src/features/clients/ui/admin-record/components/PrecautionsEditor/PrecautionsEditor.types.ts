import type { Precaution } from '../../../../domain/record/record.types'
import type { CategoryOption } from '../../types/record-action-results'

export interface PrecautionsEditorProps {
  clientId: string
  precautions: readonly Precaution[]
  categories: readonly CategoryOption[]
}
