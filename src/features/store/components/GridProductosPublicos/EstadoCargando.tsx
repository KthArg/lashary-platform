import { CADENAS_GRID_PRODUCTOS_ES } from '../../constants/grid-productos-publicos-cadenas-es'
import { gridProductosPublicosStyles as s } from './GridProductosPublicos.styles'

export function EstadoCargando() {
  return (
    <div className={s.alert} role="status">
      <span>{CADENAS_GRID_PRODUCTOS_ES.mensajeCargando}</span>
    </div>
  )
}
