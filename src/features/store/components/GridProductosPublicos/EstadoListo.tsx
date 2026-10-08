import type { EstadoGridProductos } from '../../domain/producto'
import { CADENAS_GRID_PRODUCTOS_ES } from '../../constants/grid-productos-publicos-cadenas-es'
import { gridProductosPublicosStyles as STYLES } from './GridProductosPublicos.styles'
import { TarjetaProducto } from './TarjetaProducto'

type Props = { estado: Extract<EstadoGridProductos, { tipo: 'listo' }> }

export function EstadoListo({ estado }: Props) {
  return (
    <section aria-label={CADENAS_GRID_PRODUCTOS_ES.ariaCatalogoProductos} className={STYLES.grid}>
      {estado.tarjetas.map((tarjeta) => (
        <TarjetaProducto key={tarjeta.id} tarjeta={tarjeta} />
      ))}
    </section>
  )
}
