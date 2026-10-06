import { CADENAS_GRID_PRODUCTOS_ES } from '../../constants/grid-productos-publicos-cadenas-es'
import type { BotonReintento } from './GridProductosPublicos.data'
import { gridProductosPublicosStyles as s } from './GridProductosPublicos.styles'

type Props = { boton: Extract<BotonReintento, { modo: 'activo' }>; etiqueta: string }

export function BotonReintentoActivo({ boton, etiqueta }: Props) {
  return (
    <a
      href={boton.href}
      className={s.retryButton}
      aria-label={CADENAS_GRID_PRODUCTOS_ES.ariaBotonReintentar}
    >
      {etiqueta}
    </a>
  )
}
