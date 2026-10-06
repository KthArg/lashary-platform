import { CADENAS_GRID_PRODUCTOS_ES } from '../../constants/grid-productos-publicos-cadenas-es'
import { gridProductosPublicosStyles as STYLES } from './GridProductosPublicos.styles'

export function EstadoCargando() {
  return (
    <div className={STYLES.alert} role="status">
      <span>{CADENAS_GRID_PRODUCTOS_ES.mensajeCargando}</span>
    </div>
  )
}
