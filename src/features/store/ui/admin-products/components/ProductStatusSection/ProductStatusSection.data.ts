import type { AdminProduct } from '../../../../domain/product'
import { productStrings } from '../../constants/product-strings'
import { productFormStyles as STYLES } from '../ProductForm/ProductForm.styles'

export type ProductStatusKind = 'active' | 'inactive'

export interface ProductStatusControl {
  label: string
  buttonClass: string
}

export const STATUS_CONTROLS: Record<ProductStatusKind, ProductStatusControl> = {
  active: { label: productStrings.admin.rowActions.deactivate, buttonClass: STYLES.deactivateButton },
  inactive: { label: productStrings.admin.rowActions.activate, buttonClass: STYLES.activateButton },
}

export function productStatusKind(product?: AdminProduct): ProductStatusKind {
  return product?.isActive === false ? 'inactive' : 'active'
}
