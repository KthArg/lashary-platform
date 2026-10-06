import type { ProductGridState } from '../../../../domain/product'

export interface GridReadyStateProps {
  state: Extract<ProductGridState, { kind: 'ready' }>
}
