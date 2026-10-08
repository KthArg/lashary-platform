import type { ComponentType } from 'react'
import type { EstadoGridProductos } from '../../domain/product'
import { EstadoCargando } from './EstadoCargando'
import { EstadoVacio } from './EstadoVacio'
import { EstadoError } from './EstadoError'
import { EstadoListo } from './EstadoListo'
import type { GridProductosPublicosProps } from './GridProductosPublicos.types'

const VISTAS_GRID: Record<EstadoGridProductos['tipo'], ComponentType<any>> = {
  cargando: EstadoCargando,
  vacio: EstadoVacio,
  error: EstadoError,
  listo: EstadoListo,
}

export function GridProductosPublicos({ estado, urlReintento }: GridProductosPublicosProps) {
  const Vista = VISTAS_GRID[estado.tipo]
  return <Vista estado={estado} urlReintento={urlReintento} />
}
