import { err, ok, type Result } from '@/shared/result'
import { tooManyAppointmentIds, type StorageFailed, type TooManyAppointmentIds } from '../domain/errors'
import type { AppointmentSummariesRepository, AppointmentSummary } from './appointment-summaries-ports'

export const APPOINTMENT_SUMMARIES_MAX_IDS = 100

export const getAppointmentSummaries =
  (appointments: AppointmentSummariesRepository) =>
  async (
    appointmentIds: readonly string[],
  ): Promise<Result<AppointmentSummary[], StorageFailed | TooManyAppointmentIds>> => {
    if (appointmentIds.length === 0) return ok([])
    if (appointmentIds.length > APPOINTMENT_SUMMARIES_MAX_IDS) {
      return err(tooManyAppointmentIds(APPOINTMENT_SUMMARIES_MAX_IDS))
    }
    return appointments.findByIds(appointmentIds)
  }
