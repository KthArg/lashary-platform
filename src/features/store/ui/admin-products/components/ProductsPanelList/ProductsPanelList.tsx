import { TablaProductosAdmin } from '../ProductsAdminTable'
import { EncabezadoPanelProductos } from '../ProductsPanelHeader/ProductsPanelHeader'
import { EnlaceNuevoProducto } from '../NewProductLink/NewProductLink'
import { panelAdminProductosStyles as STYLES } from '../ProductsAdminPanel/ProductsAdminPanel.styles'
import type { VistaPanelAdminProductos } from '../ProductsAdminPanel/ProductsAdminPanel.data'

type Props = { vista: Extract<VistaPanelAdminProductos, { modo: 'listado' }> }

export function PanelProductosListado({ vista }: Props) {
  return (
    <main className={STYLES.main}>
      <EncabezadoPanelProductos accion={<EnlaceNuevoProducto />} />
      <TablaProductosAdmin filas={vista.filas} />
    </main>
  )
}
