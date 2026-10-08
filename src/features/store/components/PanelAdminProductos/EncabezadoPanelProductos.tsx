import type { ReactNode } from 'react'
import { mensajesAdminProductos } from '../../constants/mensajes-admin-productos'
import { panelAdminProductosStyles as STYLES } from './PanelAdminProductos.styles'

const m = mensajesAdminProductos.admin

export function EncabezadoPanelProductos({ accion }: { accion?: ReactNode }) {
  return (
    <header className={STYLES.header}>
      <div>
        <h1 className={STYLES.title}>{m.title}</h1>
        <p className={STYLES.subtitle}>{m.subtitle}</p>
      </div>
      {accion}
    </header>
  )
}
