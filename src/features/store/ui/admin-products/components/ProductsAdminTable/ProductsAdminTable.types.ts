export interface AdminProductRow {
  id: string
  name: string
  slug: string
  formattedPrice: string
  order: number
  statusText: string
  statusClass: string
  editHref: string
}

export interface ProductsAdminTableProps {
  rows: AdminProductRow[]
}
