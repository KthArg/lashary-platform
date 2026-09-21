import type { ClientRecord } from '../../types/client.types'

export interface ClientsListProps {
  clients: readonly ClientRecord[]
  isLoading?: boolean
  /** Mensaje de lectura fallida: distinto de "no hay clientas", que seria mentir (UI-003). */
  loadError?: string | null
  /** Filtro activo: sin resultados con filtro no es lo mismo que sin clientas registradas (UI-003). */
  activeNameFilter?: string | null
}
