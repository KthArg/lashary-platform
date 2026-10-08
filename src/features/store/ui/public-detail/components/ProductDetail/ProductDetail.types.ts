import type { PublicProductDetail } from '../../../../domain/product-detail'

export interface ProductDetailProps {
  detail: PublicProductDetail
}

export interface ProductDetailView extends PublicProductDetail {
  imageAlt: string
  availabilityText: string
  availabilityClass: string
  isPurchaseDisabled: boolean
}
