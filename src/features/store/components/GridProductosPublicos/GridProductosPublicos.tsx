import type { ComponentType } from 'react'
import type { EstadoGridProductos } from '../../domain/producto'
import { EstadoCargando, EstadoVacio, EstadoError, EstadoListo } from './Estados'
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
