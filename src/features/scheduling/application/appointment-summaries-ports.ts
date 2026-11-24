import type { Result } from '@/shared/result'
import type { StorageFailed } from '../domain/errors'

export type AppointmentSummary = {
  id: string
  startsAtMs: number
  serviceName: string | null
}

export interface AppointmentSummariesRepository {
  findByIds(appointmentIds: readonly string[]): Promise<Result<AppointmentSummary[], StorageFailed>>
}
