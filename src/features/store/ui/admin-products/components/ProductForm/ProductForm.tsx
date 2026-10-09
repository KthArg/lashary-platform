'use client'

import type { ComponentType } from 'react'
import { productStrings } from '../../constants/product-strings'
import { useProductForm, type ProductFormMode } from '../../hooks/useProductForm'
import { ProductFormField } from '../ProductFormField'
import { ProductImageField } from '../ProductImageField'
import { ProductFormFeedback } from '../ProductFormFeedback'
import { ProductStatusSection } from '../ProductStatusSection'
import { NoStatusSection } from '../NoStatusSection'
import { productFormStyles as STYLES } from './ProductForm.styles'
import type { ProductFormProps } from './ProductForm.types'

const formMessages = productStrings.form

const STATUS_SECTIONS: Record<ProductFormMode, ComponentType<any>> = {
  create: NoStatusSection,
  edit: ProductStatusSection,
}

export function ProductForm({ product }: ProductFormProps) {
  const {
    mode,
    heading,
    submitLabel,
    state,
    formAction,
    pending,
    imageField,
    statusControl,
    statusState,
    statusAction,
    statusPending,
  } = useProductForm(product)

  const StatusSectionForMode = STATUS_SECTIONS[mode]

  return (
    <section className={STYLES.section}>
      <h2 className={STYLES.heading}>{heading}</h2>

      <ProductFormFeedback {...state} />

      <form action={formAction} className={STYLES.form}>
        <input type="hidden" name="id" value={product?.id ?? ''} />

        <ProductFormField
          name="name"
          label={formMessages.fields.name}
          defaultValue={product?.name}
          required
        />
        <ProductImageField {...imageField} />
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

      <StatusSectionForMode
        productId={product?.id ?? ''}
        statusControl={statusControl}
        statusAction={statusAction}
        statusState={statusState}
        statusPending={statusPending}
      />
    </section>
  )
}
