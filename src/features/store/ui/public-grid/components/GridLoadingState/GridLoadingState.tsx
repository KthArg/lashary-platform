import { PUBLIC_GRID_STRINGS } from '../../constants/public-grid-strings'
import { publicProductsGridStyles as STYLES } from '../PublicProductsGrid/PublicProductsGrid.styles'

export function GridLoadingState() {
  return (
    <div className={STYLES.alert} role="status">
      <span>{PUBLIC_GRID_STRINGS.loadingMessage}</span>
    </div>
  )
}
