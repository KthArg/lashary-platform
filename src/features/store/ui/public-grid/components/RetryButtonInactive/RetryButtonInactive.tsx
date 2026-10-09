import { PUBLIC_GRID_STRINGS } from '../../constants/public-grid-strings'
import { publicProductsGridStyles as STYLES } from '../PublicProductsGrid/PublicProductsGrid.styles'
import type { RetryButtonInactiveProps } from './RetryButtonInactive.types'

export function RetryButtonInactive({ label }: RetryButtonInactiveProps) {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      className={STYLES.retryButton}
      aria-label={PUBLIC_GRID_STRINGS.retryButtonAriaLabel}
    >
      {label}
    </button>
  )
}
