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

export type ProductFormMode = 'crear' | 'editar'

export function useProductForm(producto?: AdminProduct) {
  const modo: ProductFormMode = producto !== undefined ? 'editar' : 'crear'
  const f = productStrings.form

  const [state, formAction, pending] = useActionState(
    modo === 'editar' ? updateProductAction : createProductAction,
    initialProductActionState,
  )
  const [deactivateState, deactivateAction, deactivating] = useActionState(
    deactivateProductAction,
    initialProductActionState,
  )

  const textosPorModo: Record<ProductFormMode, { heading: string; submitLabel: string }> = {
    crear: { heading: f.legendCreate, submitLabel: f.submitCreate },
    editar: { heading: f.legendEdit, submitLabel: f.submitEdit },
  }

  return {
    modo,
    heading: textosPorModo[modo].heading,
    submitLabel: textosPorModo[modo].submitLabel,
    state,
    formAction,
    pending,
    deactivateState,
    deactivateAction,
    deactivating,
  }
}
