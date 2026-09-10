import type { ClientRecord } from './client.types'

/** Fila cruda de public.clients_profiles: snake_case y `notes` nullable, tal como llega de Postgres. */
export interface ClientProfileRow {
  id: string
  full_name: string
  phone: string
  email: string
  notes: string | null
}

/** Union y no `clients + error` sueltos: "hubo error Y ademas hay clientas" no es un estado
 *  posible, y la pantalla tiene que elegir uno (UI-003). */
export type ClientsListResult =
  | { ok: true; clients: ClientRecord[] }
  | { ok: false; error: string }
