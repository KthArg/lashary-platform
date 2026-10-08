import type { ProductGridState } from '../../../../domain/product'
import { CADENAS_GRID_PRODUCTOS_ES } from '../../constants/public-grid-strings'
import { gridProductosPublicosStyles as STYLES } from '../PublicProductsGrid/PublicProductsGrid.styles'
import { TarjetaProducto } from '../ProductCard/ProductCard'

type Props = { estado: Extract<ProductGridState, { kind: 'ready' }> }

export function EstadoListo({ estado }: Props) {
  return (
    <section aria-label={CADENAS_GRID_PRODUCTOS_ES.catalogAriaLabel} className={STYLES.grid}>
      {estado.cards.map((tarjeta) => (
        <TarjetaProducto key={tarjeta.id} tarjeta={tarjeta} />
      ))}
    </section>
  )
}
