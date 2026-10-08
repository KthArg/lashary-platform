'use client'

import type { ComponentType } from 'react'
import { productStrings } from '../../constants/product-strings'
import { useProductForm, type ProductFormMode } from '../../hooks/useProductForm'
import { Field } from '../ProductFormField/ProductFormField'
import { Feedback } from '../ProductFormFeedback/ProductFormFeedback'
import { SeccionDesactivar } from '../DeactivateSection/DeactivateSection'
import { SinSeccionDesactivar } from '../NoDeactivateSection/NoDeactivateSection'
import { formularioProductoAdminStyles as STYLES } from './ProductForm.styles'
import type { FormularioProductoAdminProps } from './ProductForm.types'

const f = productStrings.form

const SECCIONES_DESACTIVAR: Record<ProductFormMode, ComponentType<any>> = {
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
  } = useProductForm(producto)

  const SeccionDesactivarDelModo = SECCIONES_DESACTIVAR[modo]

  return (
    <section className={STYLES.section}>
      <h2 className={STYLES.heading}>{heading}</h2>

      <Feedback {...state} />

      <form action={formAction} className={STYLES.form}>
        <input type="hidden" name="id" value={producto?.id ?? ''} />

        <Field name="slug" label={f.fields.slug} defaultValue={producto?.slug} required />
        <Field name="name" label={f.fields.nombre} defaultValue={producto?.name} required />
        <Field
          name="imageUrl"
          label={f.fields.urlImagen}
          defaultValue={producto?.imageUrl}
          required
        />
        <Field
          name="priceCrc"
          label={f.fields.precioCrc}
          type="number"
          min={1}
          required
          defaultValue={producto?.priceCrc}
        />
        <Field
          name="displayOrder"
          label={f.fields.ordenPresentacion}
          type="number"
          min={0}
          required
          defaultValue={producto?.displayOrder ?? 0}
        />

        <label className={STYLES.descripcionLabel} htmlFor="descripcion">
          <span className={STYLES.labelText}>{f.fields.descripcion}</span>
          <textarea
            id="descripcion"
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
        productId={producto?.id ?? ''}
        deactivateAction={deactivateAction}
        deactivateState={deactivateState}
        deactivating={deactivating}
      />
    </section>
  )
}
