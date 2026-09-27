export const RUTA_ADMIN_PRODUCTOS = '/admin/store'

export const rutasAdminProductos = {
  admin: RUTA_ADMIN_PRODUCTOS,
  nuevoProducto: `${RUTA_ADMIN_PRODUCTOS}?new`,
  editarProducto: (id: string) => `${RUTA_ADMIN_PRODUCTOS}?edit=${id}`,
}
