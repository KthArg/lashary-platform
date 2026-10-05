import type { ClientRecord } from '../../types/client.types'

export interface ClientsListProps {
  clients: readonly ClientRecord[]
  isLoading?: boolean
  loadError?: string | null
  activeNameFilter?: string | null
}
