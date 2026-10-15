import type { PublicProductDetail } from '../../../../domain/product-detail'

export type PurchaseAccess = 'customer' | 'guest'

export type PurchaseMode = PurchaseAccess | 'soldOut'

export interface ProductDetailProps {
  detail: PublicProductDetail
  purchaseAccess: PurchaseAccess
}

export interface ProductDetailView extends PublicProductDetail {
  imageAlt: string
  availabilityText: string
  availabilityClass: string
  purchaseMode: PurchaseMode
}

export interface PurchaseActionProps {
  productId: string
  describedBy: string
  cartHref: string
}
