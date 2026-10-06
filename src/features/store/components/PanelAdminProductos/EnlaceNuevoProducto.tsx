import Link from 'next/link'
import { mensajesAdminProductos } from '../../constants/mensajes-admin-productos'
import { rutasAdminProductos } from '../../constants/rutas-admin-productos'
import { panelAdminProductosStyles as STYLES } from './PanelAdminProductos.styles'

export function EnlaceNuevoProducto() {
  return (
    <Link href={rutasAdminProductos.nuevoProducto} className={STYLES.newProductLink}>
      {mensajesAdminProductos.admin.newProduct}
    </Link>
  )
}
