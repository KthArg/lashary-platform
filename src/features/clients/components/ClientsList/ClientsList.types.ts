import type { ClientRecord } from '../../types/client.types'

export interface ClientsListProps {
  clients: readonly ClientRecord[]
  isLoading?: boolean
  /** Mensaje de lectura fallida: distinto de "no hay clientas", que seria mentir (UI-003). */
  loadError?: string | null
}
