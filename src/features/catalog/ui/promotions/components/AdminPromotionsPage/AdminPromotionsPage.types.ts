export interface AdminPromotionsSearchParams {
  edit?: string
  new?: string
  page?: string
}

export interface AdminPromotionsPageProps {
  searchParams?: Promise<AdminPromotionsSearchParams>
}
