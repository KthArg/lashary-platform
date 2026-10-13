export interface AdminPackagesSearchParams {
  edit?: string
  new?: string
  page?: string
}

export interface AdminPackagesPageProps {
  searchParams?: Promise<AdminPackagesSearchParams>
}
