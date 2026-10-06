import type { ComponentType } from 'react'
import type { ProductGridState } from '../../../../domain/product'
import { GridLoadingState } from '../GridLoadingState'
import { GridEmptyState } from '../GridEmptyState'
import { GridErrorState } from '../GridErrorState'
import { GridReadyState } from '../GridReadyState'
import type { PublicProductsGridProps } from './PublicProductsGrid.types'

const GRID_VIEWS: Record<ProductGridState['kind'], ComponentType<any>> = {
  loading: GridLoadingState,
  empty: GridEmptyState,
  error: GridErrorState,
  ready: GridReadyState,
}

export function PublicProductsGrid({ state, retryUrl }: PublicProductsGridProps) {
  const View = GRID_VIEWS[state.kind]
  return <View state={state} retryUrl={retryUrl} />
}
