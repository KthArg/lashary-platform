import type { ReactNode } from 'react'
import { productStrings } from '../../constants/product-strings'
import { panelAdminProductosStyles as STYLES } from '../ProductsAdminPanel/ProductsAdminPanel.styles'

const m = productStrings.admin

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
