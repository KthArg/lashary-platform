import type { ComponentType } from 'react'
import { obtenerVistaPanelAdminProductos, type VistaPanelAdminProductos } from './PanelAdminProductos.data'
import { PanelProductosFormulario, PanelProductosVacio, PanelProductosListado } from './PanelProductos'
import type { PanelAdminProductosProps } from './PanelAdminProductos.types'

const VISTAS_PANEL: Record<VistaPanelAdminProductos['modo'], ComponentType<any>> = {
  formulario: PanelProductosFormulario,
  vacio: PanelProductosVacio,
  listado: PanelProductosListado,
}

export async function PanelAdminProductos({ searchParams }: PanelAdminProductosProps) {
  const vista = await obtenerVistaPanelAdminProductos(searchParams)
  const Vista = VISTAS_PANEL[vista.modo]
  return <Vista vista={vista} />
}
