import type { ProductGridState } from '../../../../domain/product'

export interface GridErrorStateProps {
  state: Extract<ProductGridState, { kind: 'error' }>
  retryUrl?: string
}
