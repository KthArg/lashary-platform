'use client'

import { startTransition, useOptimistic, useState } from 'react'
import { removeFromCartAction, updateCartQuantityAction } from '../actions/cart-actions'
import {
  REMOVED_QUANTITY,
  applyCartLineChange,
  cartSubtotalLabel,
  toCartLineControls,
  type CartLineHandlers,
} from '../components/CartContents/CartContents.data'
import { initialCartActionState, type CartActionState } from '../types/cart-action-state'
import type { CartContentsView, CartLineView } from '../types/cart-page-view'

function cartForm(fields: Record<string, string>): FormData {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) formData.set(key, value)
  return formData
}

export function useCartLines(lines: CartLineView[]): CartContentsView {
  const [optimisticLines, applyChange] = useOptimistic(lines, applyCartLineChange)
  const [feedback, setFeedback] = useState<CartActionState>(initialCartActionState)

  const handlers: CartLineHandlers = {
    changeQuantity: (productId, quantity) =>
      startTransition(async () => {
        applyChange({ productId, quantity })
        const form = cartForm({ productId, quantity: String(quantity) })
        setFeedback(await updateCartQuantityAction(initialCartActionState, form))
      }),
    removeLine: (productId) =>
      startTransition(async () => {
        applyChange({ productId, quantity: REMOVED_QUANTITY })
        setFeedback(await removeFromCartAction(initialCartActionState, cartForm({ productId })))
      }),
  }

  return {
    mode: optimisticLines.length === 0 ? 'empty' : 'ready',
    lines: optimisticLines.map((line) => toCartLineControls(line, handlers)),
    subtotalLabel: cartSubtotalLabel(optimisticLines),
    feedback,
  }
}
