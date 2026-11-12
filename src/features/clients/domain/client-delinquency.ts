export type ClientDelinquencyState = 'active' | 'pending_review'

// Lo que `clients` sabe de la morosidad de una clienta: lo pide a `delinquency` por su contrato SQL
// (docs/contracts/delinquency-api.md, ARCH-005) y solo lo muestra. Solo `active` es morosidad (DOM-012).
export interface ClientDelinquency {
  readonly state: ClientDelinquencyState
  readonly pending: number
}
