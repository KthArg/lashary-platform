import { formatearPrecioCrc, type ProductoAdminVista } from '../../domain/producto'
import { mensajesAdminProductos } from '../../constants/mensajes-admin-productos'
import { rutasAdminProductos } from '../../constants/rutas-admin-productos'
import { tablaProductosAdminStyles as STYLES } from './TablaProductosAdmin.styles'
import type { FilaProductoAdmin } from './TablaProductosAdmin.types'

export function aFilasProductoAdmin(items: ProductoAdminVista[]): FilaProductoAdmin[] {
  const textosPanel = mensajesAdminProductos.admin

  return items.map((producto) => ({
    id: producto.id,
    nombre: producto.nombre,
    slug: producto.slug,
    precioFormateado: formatearPrecioCrc(producto.precioCrc),
    orden: producto.ordenPresentacion,
    estadoTexto: producto.activo ? textosPanel.status.active : textosPanel.status.inactive,
    estadoClase: producto.activo ? STYLES.badgeActive : STYLES.badgeInactive,
    hrefEditar: rutasAdminProductos.editarProducto(producto.id),
  }))
}
