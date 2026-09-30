import type { ComponentType } from 'react'
import type { EstadoGridProductos } from '../../domain/producto'
import { CADENAS_GRID_PRODUCTOS_ES } from '../../constants/grid-productos-publicos-cadenas-es'
import { calcularBotonReintento, type BotonReintento } from './GridProductosPublicos.data'
import { gridProductosPublicosStyles as s } from './GridProductosPublicos.styles'
import { TarjetaProducto } from './TarjetaProducto'

export function EstadoCargando() {
  return (
    <div className={s.alert} role="status">
      <span>{CADENAS_GRID_PRODUCTOS_ES.mensajeCargando}</span>
    </div>
  )
}

export function EstadoVacio({ estado }: { estado: Extract<EstadoGridProductos, { tipo: 'vacio' }> }) {
  return (
    <section className={s.alert} role="status">
      <div>
        <h2 className={s.alertTitle}>{estado.titulo}</h2>
        <p>{estado.descripcion}</p>
      </div>
    </section>
  )
}

function BotonReintentoActivo({
  boton,
  etiqueta,
}: {
  boton: Extract<BotonReintento, { modo: 'activo' }>
  etiqueta: string
}) {
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

function BotonReintentoInactivo({ etiqueta }: { etiqueta: string }) {
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

const BOTONES_REINTENTO: Record<BotonReintento['modo'], ComponentType<any>> = {
  activo: BotonReintentoActivo,
  inactivo: BotonReintentoInactivo,
}

export function EstadoError({
  estado,
  urlReintento,
}: {
  estado: Extract<EstadoGridProductos, { tipo: 'error' }>
  urlReintento?: string
}) {
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

export function EstadoListo({ estado }: { estado: Extract<EstadoGridProductos, { tipo: 'listo' }> }) {
  return (
    <section aria-label={CADENAS_GRID_PRODUCTOS_ES.ariaCatalogoProductos} className={s.grid}>
      {estado.tarjetas.map((tarjeta) => (
        <TarjetaProducto key={tarjeta.id} tarjeta={tarjeta} />
      ))}
    </section>
  )
}
