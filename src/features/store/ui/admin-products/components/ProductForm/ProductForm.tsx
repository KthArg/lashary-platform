'use client'

import type { ComponentType } from 'react'
import { mensajesAdminProductos } from '../../constants/product-strings'
import { useFormularioProductoAdmin, type ModoFormularioProducto } from '../../hooks/useProductForm'
import { Field } from '../ProductFormField/ProductFormField'
import { Feedback } from '../ProductFormFeedback/ProductFormFeedback'
import { SeccionDesactivar } from '../DeactivateSection/DeactivateSection'
import { SinSeccionDesactivar } from '../NoDeactivateSection/NoDeactivateSection'
import { formularioProductoAdminStyles as STYLES } from './ProductForm.styles'
import type { FormularioProductoAdminProps } from './ProductForm.types'

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
    <section className={STYLES.section}>
      <h2 className={STYLES.heading}>{heading}</h2>

      <Feedback {...state} />

      <form action={formAction} className={STYLES.form}>
        <input type="hidden" name="id" value={producto?.id ?? ''} />

        <Field name="slug" label={f.fields.slug} defaultValue={producto?.slug} required />
        <Field name="name" label={f.fields.name} defaultValue={producto?.name} required />
        <Field
          name="imageUrl"
          label={f.fields.imageUrl}
          defaultValue={producto?.imageUrl}
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

        <label className={STYLES.descripcionLabel} htmlFor="description">
          <span className={STYLES.labelText}>{f.fields.description}</span>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={producto?.description}
            className={STYLES.textarea}
          />
        </label>

        <div className={STYLES.submitWrapper}>
          <button type="submit" className={STYLES.submitButton} disabled={pending}>
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
