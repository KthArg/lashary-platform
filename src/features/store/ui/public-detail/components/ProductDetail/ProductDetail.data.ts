import type { PublicProductDetail } from '../../../../domain/product-detail'
import { PUBLIC_DETAIL_STRINGS } from '../../constants/public-detail-strings'
import { productDetailStyles as STYLES } from './ProductDetail.styles'
import type { ProductDetailView } from './ProductDetail.types'

export function toProductDetailView(detail: PublicProductDetail): ProductDetailView {
  return {
    ...detail,
    imageAlt: `${PUBLIC_DETAIL_STRINGS.imageAltPrefix} ${detail.name}`,
    availabilityText: detail.isAvailable ? PUBLIC_DETAIL_STRINGS.available : PUBLIC_DETAIL_STRINGS.soldOut,
    availabilityClass: detail.isAvailable ? STYLES.badgeAvailable : STYLES.badgeSoldOut,
    isPurchaseDisabled: !detail.isAvailable,
  }
}
