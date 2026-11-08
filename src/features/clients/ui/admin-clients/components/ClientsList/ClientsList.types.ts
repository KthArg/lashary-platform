import type { ClientListItem } from '../../../../domain/client.types'
import type { ClientDelinquency } from '@/features/clients/domain/client-delinquency'

export interface ClientsListProps {
  clients: readonly ClientListItem[]
  delinquency?: Readonly<Record<string, ClientDelinquency>>
  delinquencyAvailable?: boolean
  isLoading?: boolean
  loadError?: string | null
  filterError?: string | null
  activeNameFilter?: string | null
  hasVisitRangeFilter?: boolean
}
