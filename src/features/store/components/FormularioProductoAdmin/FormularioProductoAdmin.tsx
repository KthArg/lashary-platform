'use client'

import type { ComponentType } from 'react'
import { mensajesAdminProductos } from '../../constants/mensajes-admin-productos'
import { CAMPOS_PRODUCTO } from '../../constants/campos-producto-admin'
import { PRECIO_MINIMO_CRC, ORDEN_MINIMO } from '../../domain/producto'
import { useFormularioProductoAdmin, type ModoFormularioProducto } from '../../hooks/useFormularioProductoAdmin'
import { Field } from './Field'
import { Feedback } from './Feedback'
import { SeccionDesactivar, type SeccionDesactivarProps } from './SeccionDesactivar'
import { SinSeccionDesactivar } from './SinSeccionDesactivar'
import { formularioProductoAdminStyles as s } from './FormularioProductoAdmin.styles'
import type { FormularioProductoAdminProps } from './FormularioProductoAdmin.types'

const f = mensajesAdminProductos.form

const SECCIONES_DESACTIVAR: Record<ModoFormularioProducto, ComponentType<SeccionDesactivarProps>> = {
  crear: SinSeccionDesactivar,
  editar: SeccionDesactivar,
}

export function FormularioProductoAdmin({ producto }: FormularioProductoAdminProps) {
  const {
    modo,
    heading,
    submitLabel,
    productoId,
    valoresIniciales,
    state,
    formAction,
    pending,
    deactivateState,
    deactivateAction,
    deactivating,
  } = useFormularioProductoAdmin(producto)

  const SeccionDesactivarDelModo = SECCIONES_DESACTIVAR[modo]

  return (
    <section className={s.section}>
      <h2 className={s.heading}>{heading}</h2>

      <Feedback {...state} />

      <form action={formAction} className={s.form}>
        <input type="hidden" name={CAMPOS_PRODUCTO.id} value={productoId} />

        <Field
          name={CAMPOS_PRODUCTO.slug}
          label={f.fields.slug}
          defaultValue={valoresIniciales.slug}
          required
        />
        <Field
          name={CAMPOS_PRODUCTO.nombre}
          label={f.fields.nombre}
          defaultValue={valoresIniciales.nombre}
          required
        />
        <Field
          name={CAMPOS_PRODUCTO.urlImagen}
          label={f.fields.urlImagen}
          defaultValue={valoresIniciales.urlImagen}
          required
        />
        <Field
          name={CAMPOS_PRODUCTO.precioCrc}
          label={f.fields.precioCrc}
          type="number"
          min={PRECIO_MINIMO_CRC}
          required
          defaultValue={valoresIniciales.precioCrc}
        />
        <Field
          name={CAMPOS_PRODUCTO.ordenPresentacion}
          label={f.fields.ordenPresentacion}
          type="number"
          min={ORDEN_MINIMO}
          required
          defaultValue={valoresIniciales.ordenPresentacion}
        />

        <Field
          name={CAMPOS_PRODUCTO.descripcion}
          label={f.fields.descripcion}
          type="multiline"
          defaultValue={valoresIniciales.descripcion}
        />

        <div className={s.submitWrapper}>
          <button type="submit" className={s.submitButton} disabled={pending}>
            {submitLabel}
          </button>
        </div>
      </form>

      <SeccionDesactivarDelModo
        productoId={productoId}
        deactivateAction={deactivateAction}
        deactivateState={deactivateState}
        deactivating={deactivating}
      />
    </section>
  )
}
