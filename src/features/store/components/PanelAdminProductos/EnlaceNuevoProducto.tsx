import Link from 'next/link'
import { mensajesAdminProductos } from '../../constants/mensajes-admin-productos'
import { rutasAdminProductos } from '../../constants/rutas-admin-productos'
import { panelAdminProductosStyles as s } from './PanelAdminProductos.styles'

export function EnlaceNuevoProducto() {
  return (
    <Link href={rutasAdminProductos.nuevoProducto} className={s.newProductLink}>
      {mensajesAdminProductos.admin.newProduct}
    </Link>
  )
}
