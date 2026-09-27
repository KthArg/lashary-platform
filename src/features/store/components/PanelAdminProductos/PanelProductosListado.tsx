import { TablaProductosAdmin } from '../TablaProductosAdmin'
import { EncabezadoPanelProductos } from './EncabezadoPanelProductos'
import { EnlaceNuevoProducto } from './EnlaceNuevoProducto'
import { panelAdminProductosStyles as s } from './PanelAdminProductos.styles'
import type { VistaPanelAdminProductos } from './PanelAdminProductos.data'

type Props = { vista: Extract<VistaPanelAdminProductos, { modo: 'listado' }> }

export function PanelProductosListado({ vista }: Props) {
  return (
    <main className={s.main}>
      <EncabezadoPanelProductos accion={<EnlaceNuevoProducto />} />
      <TablaProductosAdmin filas={vista.filas} />
    </main>
  )
}
