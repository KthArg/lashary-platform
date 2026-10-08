import type { ProductGridState } from '../../../../domain/product'
import { gridProductosPublicosStyles as STYLES } from '../PublicProductsGrid/PublicProductsGrid.styles'

type Props = { estado: Extract<ProductGridState, { kind: 'empty' }> }

export function EstadoVacio({ estado }: Props) {
  return (
    <section className={STYLES.alert} role="status">
      <div>
        <h2 className={STYLES.alertTitle}>{estado.title}</h2>
        <p>{estado.description}</p>
      </div>
    </section>
  )
}
