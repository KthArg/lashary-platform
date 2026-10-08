import { CADENAS_GRID_PRODUCTOS_ES } from '../../constants/public-grid-strings'
import { gridProductosPublicosStyles as STYLES } from '../PublicProductsGrid/PublicProductsGrid.styles'

export function EstadoCargando() {
  return (
    <div className={STYLES.alert} role="status">
      <span>{CADENAS_GRID_PRODUCTOS_ES.loadingMessage}</span>
    </div>
  )
}
