export const LOYALTY_KEY = 'fidelidad'
export const LOYALTY_LEVELS_KEY = 'niveles-fidelidad'

export type LoyaltySingletonKey = typeof LOYALTY_KEY

export const MAX_LOYALTY_LEVELS = 6

export type LoyaltyLevel = {
  visit: number
  benefit: string
  detail: string | null
}

export type LoyaltyContent = {
  paragraphs: string[]
  note: string | null
  levels: LoyaltyLevel[]
}
