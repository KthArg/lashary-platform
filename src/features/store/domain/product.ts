import { ok, err, type Result } from '@/shared/result'
import { createInvalidProduct, type InvalidProduct } from './product-errors'

export type PublicProduct = {
  id: string;
  name: string;
  imageUrl: string;
  priceCrc: number;
  isActive: boolean;
};

export type PublicProductCard = {
  id: string;
  name: string;
  imageUrl: string;
  priceLabel: string;
};

export type ProductGridState =
  | { kind: 'loading' }
  | { kind: 'empty'; title: string; description: string }
  | { kind: 'error'; title: string; description: string; retryLabel: string }
  | { kind: 'ready'; cards: PublicProductCard[] };

export type ProductGridStrings = {
  emptyTitle: string;
  emptyDescription: string;
  errorTitle: string;
  errorDescription: string;
  retryLabel: string;
  loadingMessage: string;
  catalogAriaLabel: string;
  productAltPrefix: string;
  retryButtonAriaLabel: string;
};

export function formatPriceCrc(priceCrc: number): string {
  const formatter = new Intl.NumberFormat('es-CR', {
    style: 'currency',
    currency: 'CRC',
    maximumFractionDigits: 0,
  });

  return formatter.format(priceCrc);
}

const DANGEROUS_URL_SCHEME = /^(javascript|data):/i;

export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed || DANGEROUS_URL_SCHEME.test(trimmed)) return '';
  return trimmed;
}

export function toProductCard(product: PublicProduct): PublicProductCard {
  return {
    id: product.id,
    name: product.name,
    imageUrl: sanitizeUrl(product.imageUrl),
    priceLabel: formatPriceCrc(product.priceCrc),
  };
}

export type AdminProduct = {
  id: string
  slug: string
  name: string
  description: string
  imageUrl: string
  priceCrc: number
  activo: boolean
  displayOrder: number
}

export type ProductInput = {
  id: string
  slug: string
  name: string
  description: string
  imageUrl: string
  priceCrc: number
  activo?: boolean
  displayOrder: number
}

const isNonNegativeInteger = (n: number): boolean => Number.isInteger(n) && n >= 0
const isPositiveInteger = (n: number): boolean => Number.isInteger(n) && n > 0

export function buildProduct(input: ProductInput): Result<AdminProduct, InvalidProduct> {
  const problems: string[] = []

  const slug = input.slug.trim()
  if (slug.length === 0) problems.push('el slug no puede estar vacío')

  const name = input.name.trim()
  if (name.length === 0) problems.push('el name no puede estar vacío')

  const imageUrl = input.imageUrl.trim()
  if (imageUrl.length === 0) problems.push('la URL de la imagen no puede estar vacía')

  if (!isPositiveInteger(input.priceCrc)) {
    problems.push('el precio debe ser un entero de colones mayor que cero')
  }

  if (!isNonNegativeInteger(input.displayOrder)) {
    problems.push('el orden de presentación debe ser un entero no negativo')
  }

  if (problems.length > 0) {
    return err(createInvalidProduct(problems))
  }

  return ok({
    id: input.id,
    slug,
    name,
    description: input.description.trim(),
    imageUrl,
    priceCrc: input.priceCrc,
    activo: input.activo ?? true,
    displayOrder: input.displayOrder,
  })
}

export function markProductInactive(producto: AdminProduct): AdminProduct {
  return { ...producto, activo: false }
}
