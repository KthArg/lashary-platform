import { CADENAS_GRID_PRODUCTOS_ES } from '../../constants/public-grid-strings'
import type { BotonReintento } from '../PublicProductsGrid/PublicProductsGrid.data'
import { gridProductosPublicosStyles as STYLES } from '../PublicProductsGrid/PublicProductsGrid.styles'

type Props = { boton: Extract<BotonReintento, { modo: 'inactivo' }>; etiqueta: string }

export function BotonReintentoInactivo({ etiqueta }: Props) {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      className={STYLES.retryButton}
      aria-label={CADENAS_GRID_PRODUCTOS_ES.ariaBotonReintentar}
    >
      {etiqueta}
    </button>
  )
}
