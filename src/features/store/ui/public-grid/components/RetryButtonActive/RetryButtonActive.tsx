import { PUBLIC_GRID_STRINGS } from '../../constants/public-grid-strings'
import { publicProductsGridStyles as STYLES } from '../PublicProductsGrid/PublicProductsGrid.styles'
import type { RetryButtonActiveProps } from './RetryButtonActive.types'

export function RetryButtonActive({ button, label }: RetryButtonActiveProps) {
  return (
    <a
      href={button.href}
      className={STYLES.retryButton}
      aria-label={PUBLIC_GRID_STRINGS.retryButtonAriaLabel}
    >
      {label}
    </a>
  )
}
