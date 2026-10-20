import { DEFAULT_PRECAUTION_ICON, PRECAUTION_CATEGORY_ICONS, type RecordIconName } from './constants/record-icons'
import { PRECAUTION_CATEGORY_TITLES } from './constants/record-strings'
import type { Precaution } from '../../domain/record/record.types'
import type { CategoryOption } from './types/record-action-results'

export interface PrecautionGroup {
  readonly categoryId: string
  readonly title: string
  readonly icon: RecordIconName
  readonly precautions: readonly Precaution[]
}

const toGroup = (categoryId: string, name: string, precautions: readonly Precaution[]): PrecautionGroup => ({
  categoryId,
  title: PRECAUTION_CATEGORY_TITLES[name] ?? name,
  icon: PRECAUTION_CATEGORY_ICONS[name] ?? DEFAULT_PRECAUTION_ICON,
  precautions: precautions.filter((precaution) => precaution.categoryId === categoryId),
})

export function groupPrecautions(categories: readonly CategoryOption[], precautions: readonly Precaution[]): PrecautionGroup[] {
  const known = new Set(categories.map((category) => category.id))
  const missing = precautions.filter(
    (precaution, index) =>
      !known.has(precaution.categoryId) &&
      precautions.findIndex((other) => other.categoryId === precaution.categoryId) === index,
  )
  return [
    ...categories.map((category) => toGroup(category.id, category.name, precautions)),
    ...missing.map((precaution) => toGroup(precaution.categoryId, precaution.categoryName, precautions)),
  ]
}
