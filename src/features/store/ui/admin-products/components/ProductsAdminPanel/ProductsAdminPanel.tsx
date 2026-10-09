import type { ComponentType } from 'react'
import { getProductsAdminPanelView, type ProductsAdminPanelView } from './ProductsAdminPanel.data'
import { ProductsPanelForm } from '../ProductsPanelForm'
import { ProductsPanelEmpty } from '../ProductsPanelEmpty'
import { ProductsPanelList } from '../ProductsPanelList'
import type { ProductsAdminPanelProps } from './ProductsAdminPanel.types'

const PANEL_VIEWS: Record<ProductsAdminPanelView['mode'], ComponentType<any>> = {
  form: ProductsPanelForm,
  empty: ProductsPanelEmpty,
  list: ProductsPanelList,
}

export async function ProductsAdminPanel({ searchParams }: ProductsAdminPanelProps) {
  const view = await getProductsAdminPanelView(searchParams)
  const View = PANEL_VIEWS[view.mode]
  return <View view={view} />
}
