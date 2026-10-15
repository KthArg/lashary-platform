import type { CartActionState } from './cart-action-state'

export interface CartLineView {
  productId: string
  name: string
  href: string
  imageUrl: string
  imageAlt: string
  unitPriceLabel: string
  unitPriceColones: number
  quantity: number
}

export interface CartLineControls extends CartLineView {
  quantityLabel: string
  lineTotalLabel: string
  increaseLabel: string
  decreaseLabel: string
  removeLabel: string
  isIncreaseDisabled: boolean
  isDecreaseDisabled: boolean
  increase: () => void
  decrease: () => void
  remove: () => void
}

export interface CartContentsView {
  mode: 'empty' | 'ready'
  lines: CartLineControls[]
  subtotalLabel: string
  feedback: CartActionState
}

export interface CartContentsProps {
  lines: CartLineView[]
}

export interface CartViewProps {
  view: CartContentsView
}
