export interface ProductsAdminPanelSearchParams {
  edit?: string
  new?: string
}

export interface ProductsAdminPanelProps {
  searchParams?: Promise<ProductsAdminPanelSearchParams>
}
