export const DELINQUENCY_FILTER_VALUES = ['active', 'pending_review', 'none'] as const

export type DelinquencyFilter = (typeof DELINQUENCY_FILTER_VALUES)[number]

export function readDelinquencyFilter(value: unknown): DelinquencyFilter | null {
  return DELINQUENCY_FILTER_VALUES.find((filter) => filter === value) ?? null
}
