import type { ComponentType } from 'react'
import type { ProductGridState } from '../../../../domain/product'
import { EstadoCargando } from '../GridLoadingState/GridLoadingState'
import { EstadoVacio } from '../GridEmptyState/GridEmptyState'
import { EstadoError } from '../GridErrorState/GridErrorState'
import { EstadoListo } from '../GridReadyState/GridReadyState'
import type { GridProductosPublicosProps } from './PublicProductsGrid.types'

const VISTAS_GRID: Record<ProductGridState['kind'], ComponentType<any>> = {
  loading: EstadoCargando,
  empty: EstadoVacio,
  error: EstadoError,
  ready: EstadoListo,
}

export function GridProductosPublicos({ estado, urlReintento }: GridProductosPublicosProps) {
  const Vista = VISTAS_GRID[estado.kind]
  return <Vista estado={estado} urlReintento={urlReintento} />
}
