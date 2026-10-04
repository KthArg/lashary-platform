// Mecánica informativa del programa de fidelidad (docs/contracts/cms-api.md v1.4, US-LAND-05).
export const LOYALTY_KEY = 'fidelidad'
// Provisional hasta el motor de fidelidad (US-LAND-06): entonces los niveles salen de ahí.
export const LOYALTY_LEVELS_KEY = 'niveles-fidelidad'

export type LoyaltySingletonKey = typeof LOYALTY_KEY

// Cuántos niveles muestra la landing como máximo.
export const MAX_LOYALTY_LEVELS = 6

// Qué beneficio da una visita.
export type LoyaltyLevel = {
  visit: number
  benefit: string
  detail: string | null
}

// Sin nada publicado todo llega vacío: no hay respaldo, porque inventar beneficios sería
// prometerle algo a una clienta.
export type LoyaltyContent = {
  paragraphs: string[]
  note: string | null
  levels: LoyaltyLevel[]
}
