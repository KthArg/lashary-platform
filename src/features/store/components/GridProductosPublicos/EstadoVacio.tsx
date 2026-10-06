import type { EstadoGridProductos } from '../../domain/product'
import { gridProductosPublicosStyles as STYLES } from './GridProductosPublicos.styles'

type Props = { estado: Extract<EstadoGridProductos, { tipo: 'vacio' }> }

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
