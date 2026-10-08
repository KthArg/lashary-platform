import { formatPriceCrc, sanitizeUrl } from './product'

export type PublicProductDetailSource = {
  slug: string
  name: string
  description: string
  imageUrl: string
  priceCrc: number
  stock: number
  isActive: boolean
}

export type PublicProductDetail = {
  slug: string
  name: string
  description: string
  imageUrl: string
  priceLabel: string
  isAvailable: boolean
}

export function toProductDetail(source: PublicProductDetailSource): PublicProductDetail {
  return {
    slug: source.slug,
    name: source.name,
    description: source.description,
    imageUrl: sanitizeUrl(source.imageUrl),
    priceLabel: formatPriceCrc(source.priceCrc),
    isAvailable: source.stock > 0,
  }
}
