import type { ClientRecord } from '../../types/client.types'

export interface ClientsListProps {
  clients: readonly ClientRecord[]
  /** Mensaje de fallo de la lectura. Presente = la lista no se pudo cargar (UI-003). */
  error?: string | null
}
