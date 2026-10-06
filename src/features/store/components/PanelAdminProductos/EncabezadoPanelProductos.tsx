import type { ReactNode } from 'react'
import { mensajesAdminProductos } from '../../constants/mensajes-admin-productos'
import { panelAdminProductosStyles as STYLES } from './PanelAdminProductos.styles'

const textosPanel = mensajesAdminProductos.admin

export function EncabezadoPanelProductos({ accion }: { accion?: ReactNode }) {
  return (
    <header className={STYLES.header}>
      <div>
        <h1 className={STYLES.title}>{textosPanel.title}</h1>
        <p className={STYLES.subtitle}>{textosPanel.subtitle}</p>
      </div>
      {accion}
    </header>
  )
}
