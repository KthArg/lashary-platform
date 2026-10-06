import type { ReactNode } from 'react'
import { mensajesAdminProductos } from '../../constants/mensajes-admin-productos'
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
