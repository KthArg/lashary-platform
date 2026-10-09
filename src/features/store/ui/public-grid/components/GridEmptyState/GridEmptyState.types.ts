import type { ProductGridState } from '../../../../domain/product'

export interface GridEmptyStateProps {
  state: Extract<ProductGridState, { kind: 'empty' }>
}
