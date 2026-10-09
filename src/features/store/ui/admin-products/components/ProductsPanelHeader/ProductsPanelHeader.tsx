import { productStrings } from '../../constants/product-strings'
import { productsAdminPanelStyles as STYLES } from '../ProductsAdminPanel/ProductsAdminPanel.styles'
import type { ProductsPanelHeaderProps } from './ProductsPanelHeader.types'

const adminMessages = productStrings.admin

export function ProductsPanelHeader({ action }: ProductsPanelHeaderProps) {
  return (
    <header className={STYLES.header}>
      <div>
        <h1 className={STYLES.title}>{adminMessages.title}</h1>
        <p className={STYLES.subtitle}>{adminMessages.subtitle}</p>
      </div>
      {action}
    </header>
  )
}
