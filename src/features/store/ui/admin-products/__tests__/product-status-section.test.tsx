import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ProductStatusSection } from '@/features/store/ui/admin-products/components/ProductStatusSection'
import {
  STATUS_CONTROLS,
  productStatusKind,
} from '@/features/store/ui/admin-products/components/ProductStatusSection/ProductStatusSection.data'
import { productStrings } from '@/features/store/ui/admin-products/constants/product-strings'
import { initialProductActionState } from '@/features/store/ui/admin-products/types/product-action-state'
import { makeProduct } from '@/features/store/application/admin-products/__tests__/product-fixture'

const renderFor = (isActive: boolean) =>
  renderToStaticMarkup(
    <ProductStatusSection
      productId="p-1"
      statusControl={STATUS_CONTROLS[productStatusKind(makeProduct({ isActive }))]}
      statusAction={() => {}}
      statusState={initialProductActionState}
      statusPending={false}
    />,
  )

describe('sección de estado del producto en el formulario de edición', () => {
  it('un producto activo ofrece desactivarlo', () => {
    expect(renderFor(true)).toContain(productStrings.admin.rowActions.deactivate)
  })

  it('un producto desactivado ofrece volver a activarlo, no desactivarlo otra vez', () => {
    const html = renderFor(false)

    expect(html).toContain(productStrings.admin.rowActions.activate)
    expect(html).not.toContain(productStrings.admin.rowActions.deactivate)
  })
})
