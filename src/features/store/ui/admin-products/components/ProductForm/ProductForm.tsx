'use client'

import type { ComponentType } from 'react'
import { productStrings } from '../../constants/product-strings'
import { useProductForm, type ProductFormMode } from '../../hooks/useProductForm'
import { ProductFormField } from '../ProductFormField'
import { ProductFormFeedback } from '../ProductFormFeedback'
import { DeactivateSection } from '../DeactivateSection'
import { NoDeactivateSection } from '../NoDeactivateSection'
import { productFormStyles as STYLES } from './ProductForm.styles'
import type { ProductFormProps } from './ProductForm.types'

const formMessages = productStrings.form

const DEACTIVATE_SECTIONS: Record<ProductFormMode, ComponentType<any>> = {
  create: NoDeactivateSection,
  edit: DeactivateSection,
}

export function ProductForm({ product }: ProductFormProps) {
  const {
    mode,
    heading,
    submitLabel,
    state,
    formAction,
    pending,
    deactivateState,
    deactivateAction,
    deactivating,
  } = useProductForm(product)

  const DeactivateSectionForMode = DEACTIVATE_SECTIONS[mode]

  return (
    <section className={STYLES.section}>
      <h2 className={STYLES.heading}>{heading}</h2>

      <ProductFormFeedback {...state} />

      <form action={formAction} className={STYLES.form}>
        <input type="hidden" name="id" value={product?.id ?? ''} />

        <ProductFormField
          name="slug"
          label={formMessages.fields.slug}
          defaultValue={product?.slug}
          required
        />
        <ProductFormField
          name="name"
          label={formMessages.fields.name}
          defaultValue={product?.name}
          required
        />
        <ProductFormField
          name="imageUrl"
          label={formMessages.fields.imageUrl}
          defaultValue={product?.imageUrl}
          required
        />
        <ProductFormField
          name="priceCrc"
          label={formMessages.fields.priceCrc}
          type="number"
          min={1}
          required
          defaultValue={product?.priceCrc}
        />
        <ProductFormField
          name="displayOrder"
          label={formMessages.fields.displayOrder}
          type="number"
          min={0}
          required
          defaultValue={product?.displayOrder ?? 0}
        />
        <ProductFormField
          name="stock"
          label={formMessages.fields.stock}
          type="number"
          min={0}
          required
          defaultValue={product?.stock ?? 0}
        />

        <label className={STYLES.descriptionLabel} htmlFor="description">
          <span className={STYLES.labelText}>{formMessages.fields.description}</span>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={product?.description}
            className={STYLES.textarea}
          />
        </label>

        <div className={STYLES.submitWrapper}>
          <button type="submit" className={STYLES.submitButton} disabled={pending}>
            {submitLabel}
          </button>
        </div>
      </form>

      <DeactivateSectionForMode
        productId={product?.id ?? ''}
        deactivateAction={deactivateAction}
        deactivateState={deactivateState}
        deactivating={deactivating}
      />
    </section>
  )
}
