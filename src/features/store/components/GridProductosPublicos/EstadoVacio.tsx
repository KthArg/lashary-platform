import type { EstadoGridProductos } from '../../domain/producto'
import { gridProductosPublicosStyles as s } from './GridProductosPublicos.styles'

type Props = { estado: Extract<EstadoGridProductos, { tipo: 'vacio' }> }

export function EstadoVacio({ estado }: Props) {
  return (
    <section className={s.alert} role="status">
      <div>
        <h2 className={s.alertTitle}>{estado.titulo}</h2>
        <p>{estado.descripcion}</p>
      </div>
    </section>
  )
}
