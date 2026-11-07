import type { ClientsListSearchParams } from '@/features/clients'

export interface AdminClientsPageProps {
  searchParams?: Promise<ClientsListSearchParams>
}
