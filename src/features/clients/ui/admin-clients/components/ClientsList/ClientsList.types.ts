import type { ClientListItem } from '../../../../domain/client.types'

export interface ClientsListProps {
  clients: readonly ClientListItem[]
  isLoading?: boolean
  loadError?: string | null
  filterError?: string | null
  activeNameFilter?: string | null
  hasVisitRangeFilter?: boolean
}
