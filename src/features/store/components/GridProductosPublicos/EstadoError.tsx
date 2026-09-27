import type { ComponentType } from 'react'
import type { EstadoGridProductos } from '../../domain/producto'
import { calcularBotonReintento, type BotonReintento } from './GridProductosPublicos.data'
import { BotonReintentoActivo } from './BotonReintentoActivo'
import { BotonReintentoInactivo } from './BotonReintentoInactivo'
import { gridProductosPublicosStyles as s } from './GridProductosPublicos.styles'

type Props = {
  estado: Extract<EstadoGridProductos, { tipo: 'error' }>
  urlReintento?: string
}

const BOTONES_REINTENTO: Record<BotonReintento['modo'], ComponentType<any>> = {
  activo: BotonReintentoActivo,
  inactivo: BotonReintentoInactivo,
}

export function EstadoError({ estado, urlReintento }: Props) {
  const boton = calcularBotonReintento(urlReintento)
  const BotonReintento = BOTONES_REINTENTO[boton.modo]

  return (
    <section className={s.alertError} role="alert">
      <div>
        <h2 className={s.alertTitle}>{estado.titulo}</h2>
        <p>{estado.descripcion}</p>
        <BotonReintento boton={boton} etiqueta={estado.etiquetaReintentar} />
      </div>
    </section>
  )
}
