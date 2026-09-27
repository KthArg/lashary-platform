import { CADENAS_GRID_PRODUCTOS_ES } from '../../constants/grid-productos-publicos-cadenas-es'
import type { BotonReintento } from './GridProductosPublicos.data'
import { gridProductosPublicosStyles as s } from './GridProductosPublicos.styles'

type Props = { boton: Extract<BotonReintento, { modo: 'inactivo' }>; etiqueta: string }

export function BotonReintentoInactivo({ etiqueta }: Props) {
  return (
    <button
      type="button"
      disabled
      aria-disabled="true"
      className={s.retryButton}
      aria-label={CADENAS_GRID_PRODUCTOS_ES.ariaBotonReintentar}
    >
      {etiqueta}
    </button>
  )
}
