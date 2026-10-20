import type { Precaution } from '@/features/clients/domain/record/record.types'
import type { CategoryOption } from '../../types/record-action-results'

export interface PrecautionsEditorProps {
  clientId: string
  precautions: readonly Precaution[]
  categories: readonly CategoryOption[]
}
