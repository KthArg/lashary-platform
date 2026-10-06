'use client'

import type { ComponentType } from 'react'
import { mensajesAdminProductos } from '../../constants/mensajes-admin-productos'
import { useFormularioProductoAdmin, type ModoFormularioProducto } from '../../hooks/useFormularioProductoAdmin'
import { Field } from './Field'
import { Feedback } from './Feedback'
import { SeccionDesactivar, SinSeccionDesactivar } from './SeccionDesactivar'
import { formularioProductoAdminStyles as s } from './FormularioProductoAdmin.styles'
import type { FormularioProductoAdminProps } from './FormularioProductoAdmin.types'

const f = mensajesAdminProductos.form

const SECCIONES_DESACTIVAR: Record<ModoFormularioProducto, ComponentType<any>> = {
  crear: SinSeccionDesactivar,
  editar: SeccionDesactivar,
}

export function FormularioProductoAdmin({ producto }: FormularioProductoAdminProps) {
  const {
    modo,
    heading,
    submitLabel,
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
        <input type="hidden" name="id" value={producto?.id ?? ''} />

        <Field name="slug" label={f.fields.slug} defaultValue={producto?.slug} required />
        <Field name="nombre" label={f.fields.nombre} defaultValue={producto?.nombre} required />
        <Field
          name="urlImagen"
          label={f.fields.urlImagen}
          defaultValue={producto?.urlImagen}
          required
        />
        <Field
          name="precioCrc"
          label={f.fields.precioCrc}
          type="number"
          min={1}
          required
          defaultValue={producto?.precioCrc}
        />
        <Field
          name="ordenPresentacion"
          label={f.fields.ordenPresentacion}
          type="number"
          min={0}
          required
          defaultValue={producto?.ordenPresentacion ?? 0}
        />

        <label className={s.descripcionLabel} htmlFor="descripcion">
          <span className={s.labelText}>{f.fields.descripcion}</span>
          <textarea
            id="descripcion"
            name="descripcion"
            rows={3}
            defaultValue={producto?.descripcion}
            className={s.textarea}
          />
        </label>

        <div className={s.submitWrapper}>
          <button type="submit" className={s.submitButton} disabled={pending}>
            {submitLabel}
          </button>
        </div>
      </form>

      <SeccionDesactivarDelModo
        productoId={producto?.id ?? ''}
        deactivateAction={deactivateAction}
        deactivateState={deactivateState}
        deactivating={deactivating}
      />
    </section>
  )
}
