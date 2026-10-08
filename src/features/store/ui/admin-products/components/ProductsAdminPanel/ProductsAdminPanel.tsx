import type { ComponentType } from 'react'
import { obtenerVistaPanelAdminProductos, type VistaPanelAdminProductos } from './ProductsAdminPanel.data'
import { PanelProductosFormulario } from '../ProductsPanelForm/ProductsPanelForm'
import { PanelProductosVacio } from '../ProductsPanelEmpty/ProductsPanelEmpty'
import { PanelProductosListado } from '../ProductsPanelList/ProductsPanelList'
import type { PanelAdminProductosProps } from './ProductsAdminPanel.types'

const VISTAS_PANEL: Record<VistaPanelAdminProductos['modo'], ComponentType<any>> = {
  formulario: PanelProductosFormulario,
  vacio: PanelProductosVacio,
  listado: PanelProductosListado,
}

export async function ProductsAdminPanel({ searchParams }: PanelAdminProductosProps) {
  const vista = await obtenerVistaPanelAdminProductos(searchParams)
  const Vista = VISTAS_PANEL[vista.modo]
  return <Vista vista={vista} />
}
