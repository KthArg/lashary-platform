export interface AdminCatalogSearchParams {
  edit?: string
  new?: string
}

export interface AdminCatalogPageProps {
  searchParams?: Promise<AdminCatalogSearchParams>
}
