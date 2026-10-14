export interface CartLineView {
  productId: string
  name: string
  href: string
  imageUrl: string
  imageAlt: string
  quantityLabel: string
  unitPriceLabel: string
  lineTotalLabel: string
}

export interface CartPageView {
  mode: 'empty' | 'ready'
  lines: CartLineView[]
  subtotalLabel: string
}

export interface CartViewProps {
  view: CartPageView
}
