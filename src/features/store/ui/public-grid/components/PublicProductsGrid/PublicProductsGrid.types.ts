import type { ProductGridState } from '../../../../domain/product'

export interface PublicProductsGridProps {
  state: ProductGridState
  retryUrl?: string
}
