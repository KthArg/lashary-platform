import type { ProductGridState } from '../../../../domain/product'
import { gridProductosPublicosStyles as STYLES } from '../PublicProductsGrid/PublicProductsGrid.styles'

type Props = { estado: Extract<ProductGridState, { tipo: 'vacio' }> }

export function EstadoVacio({ estado }: Props) {
  return (
    <section className={STYLES.alert} role="status">
      <div>
        <h2 className={STYLES.alertTitle}>{estado.titulo}</h2>
        <p>{estado.descripcion}</p>
      </div>
    </section>
  )
}
