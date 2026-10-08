export type FilaProductoAdmin = {
  id: string
  nombre: string
  slug: string
  precioFormateado: string
  orden: number
  estadoTexto: string
  estadoClase: string
  hrefEditar: string
}

export type TablaProductosAdminProps = {
  filas: FilaProductoAdmin[]
}
