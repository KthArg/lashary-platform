import type { ReactNode } from 'react'
import Link from 'next/link'
import { mensajesAdminProductos } from '../../constants/mensajes-admin-productos'
import { rutasAdminProductos } from '../../constants/rutas-admin-productos'
import { panelAdminProductosStyles as s } from './PanelAdminProductos.styles'

const m = mensajesAdminProductos.admin

export function EncabezadoPanelProductos({ accion }: { accion?: ReactNode }) {
  return (
    <header className={s.header}>
      <div>
        <h1 className={s.title}>{m.title}</h1>
        <p className={s.subtitle}>{m.subtitle}</p>
      </div>
      {accion}
    </header>
  )
}

export function EnlaceNuevoProducto() {
  return (
    <Link href={rutasAdminProductos.nuevoProducto} className={s.newProductLink}>
      {mensajesAdminProductos.admin.newProduct}
    </Link>
  )
}
