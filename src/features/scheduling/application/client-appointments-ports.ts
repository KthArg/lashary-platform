import type { Result } from '@/shared/result'
import type { StorageFailed } from '../domain/errors'

export type ClientAppointmentStatus =
  | 'pending_approval'
  | 'approved'
  | 'confirmed'
  | 'rejected'
  | 'cancelled'
  | 'completed'
  | 'no_show'

export type ClientAppointmentView = {
  id: string
  startsAtMs: number
  status: ClientAppointmentStatus
  techniqueName: string
  depositRequired: number
  depositRegistered: number
}

export type ListClientAppointmentsQuery = {
  clientId: string
  page?: number
  pageSize?: number
}

export type ClientAppointmentsPage = {
  items: ClientAppointmentView[]
  total: number
  page: number
  pageSize: number
}

export type ClientAppointmentsSlice = {
  clientId: string
  offset: number
  limit: number
}

export type ClientAppointmentsRows = {
  items: ClientAppointmentView[]
  total: number
}

export interface ClientAppointmentsRepository {
  listByClient(slice: ClientAppointmentsSlice): Promise<Result<ClientAppointmentsRows, StorageFailed>>
}
