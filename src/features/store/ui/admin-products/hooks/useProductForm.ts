'use client'

import { useActionState } from 'react'
import type { AdminProduct } from '../../../domain/product'
import { productStrings } from '../constants/product-strings'
import {
  createProductAction,
  updateProductAction,
  deactivateProductAction,
} from '../actions/product-actions'
import { initialProductActionState } from '../types/product-action-state'

export type ProductFormMode = 'create' | 'edit'

export function useProductForm(product?: AdminProduct) {
  const mode: ProductFormMode = product !== undefined ? 'edit' : 'create'
  const formMessages = productStrings.form

  const [state, formAction, pending] = useActionState(
    mode === 'edit' ? updateProductAction : createProductAction,
    initialProductActionState,
  )
  const [deactivateState, deactivateAction, deactivating] = useActionState(
    deactivateProductAction,
    initialProductActionState,
  )

  const textsByMode: Record<ProductFormMode, { heading: string; submitLabel: string }> = {
    create: { heading: formMessages.legendCreate, submitLabel: formMessages.submitCreate },
    edit: { heading: formMessages.legendEdit, submitLabel: formMessages.submitEdit },
  }

  return {
    mode,
    heading: textsByMode[mode].heading,
    submitLabel: textsByMode[mode].submitLabel,
    state,
    formAction,
    pending,
    deactivateState,
    deactivateAction,
    deactivating,
  }
}
