import type { ClientFormValues } from './client-form.types'

export interface ClientRecord extends ClientFormValues { id: string }

export interface ClientListItem extends ClientRecord { lastAppointmentAtMs: number | null }
