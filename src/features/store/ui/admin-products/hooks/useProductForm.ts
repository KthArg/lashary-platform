'use client'

import { useActionState } from 'react'
import type { AdminProduct } from '../../../domain/product'
import { productStrings } from '../constants/product-strings'
import {
  createProductAction,
  updateProductAction,
  deactivateProductAction,
  activateProductAction,
} from '../actions/product-actions'
import { initialProductActionState } from '../types/product-action-state'
import {
  STATUS_CONTROLS,
  productStatusKind,
  type ProductStatusKind,
} from '../components/ProductStatusSection/ProductStatusSection.data'

export type ProductFormMode = 'create' | 'edit'

const STATUS_ACTIONS: Record<ProductStatusKind, typeof deactivateProductAction> = {
  active: deactivateProductAction,
  inactive: activateProductAction,
}

export function useProductForm(product?: AdminProduct) {
  const mode: ProductFormMode = product !== undefined ? 'edit' : 'create'
  const formMessages = productStrings.form

  const [state, formAction, pending] = useActionState(
    mode === 'edit' ? updateProductAction : createProductAction,
    initialProductActionState,
  )
  const statusKind = productStatusKind(product)
  const [statusState, statusAction, statusPending] = useActionState(
    STATUS_ACTIONS[statusKind],
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
    statusControl: STATUS_CONTROLS[statusKind],
    statusState,
    statusAction,
    statusPending,
  }
}
