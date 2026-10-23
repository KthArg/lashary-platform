export interface AdminAppointmentsPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ page?: string | string[] }>
}
