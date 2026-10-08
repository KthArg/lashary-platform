import { CADENAS_GRID_PRODUCTOS_ES } from '../../constants/public-grid-strings'
import type { BotonReintento } from '../PublicProductsGrid/PublicProductsGrid.data'
import { gridProductosPublicosStyles as STYLES } from '../PublicProductsGrid/PublicProductsGrid.styles'

type Props = { boton: Extract<BotonReintento, { modo: 'activo' }>; etiqueta: string }

export function BotonReintentoActivo({ boton, etiqueta }: Props) {
  return (
    <a
      href={boton.href}
      className={STYLES.retryButton}
      aria-label={CADENAS_GRID_PRODUCTOS_ES.ariaBotonReintentar}
    >
      {etiqueta}
    </a>
  )
}
