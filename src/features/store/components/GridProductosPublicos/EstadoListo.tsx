import type { EstadoGridProductos } from '../../domain/producto'
import { CADENAS_GRID_PRODUCTOS_ES } from '../../constants/grid-productos-publicos-cadenas-es'
import { gridProductosPublicosStyles as s } from './GridProductosPublicos.styles'
import { TarjetaProducto } from './TarjetaProducto'

type Props = { estado: Extract<EstadoGridProductos, { tipo: 'listo' }> }

export function EstadoListo({ estado }: Props) {
  return (
    <section aria-label={CADENAS_GRID_PRODUCTOS_ES.ariaCatalogoProductos} className={s.grid}>
      {estado.tarjetas.map((tarjeta) => (
        <TarjetaProducto key={tarjeta.id} tarjeta={tarjeta} />
      ))}
    </section>
  )
}
