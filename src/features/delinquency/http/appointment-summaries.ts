import { getAppointmentSummaries } from '@/features/scheduling'
import { err, isErr, ok } from '@/shared/result'
import { delinquencyStorageFailed } from '../domain/errors'
import type { AppointmentSummariesPort } from '../application/ports'

export function appointmentSummaries(): AppointmentSummariesPort {
  return {
    async summariesFor(appointmentIds) {
      const result = await getAppointmentSummaries(appointmentIds)
      if (isErr(result)) return err(delinquencyStorageFailed(result.error.message))
      return ok(
        new Map(
          result.value.map((summary) => [
            summary.id,
            { startsAtMs: summary.startsAtMs, serviceName: summary.serviceName },
          ]),
        ),
      )
    },
  }
}
