import { listClientAppointments } from '@/features/scheduling'
import { err, isErr, ok } from '@/shared/result'
import type { AppointmentHistorySource } from '../../application/history/history-ports'

export const schedulingAppointmentHistory: AppointmentHistorySource = async (query) => {
  try {
    const result = await listClientAppointments({ clientId: query.clientId, page: query.page })
    if (isErr(result)) return err('history-unavailable')
    const { items, total, page, pageSize } = result.value
    return ok({
      records: items.map((appointment) => ({
        id: appointment.id,
        startsAtMs: appointment.startsAtMs,
        status: appointment.status,
        serviceName: appointment.techniqueName,
        depositRequired: appointment.depositRequired,
        depositRegistered: appointment.depositRegistered,
      })),
      total,
      page,
      pageSize,
    })
  } catch {
    return err('history-unavailable')
  }
}
