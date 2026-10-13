import type { ClientHistoryPort } from './ports'

export const noAppointmentHistoryYet: ClientHistoryPort = {
  async hasCompletedAppointment() {
    return false
  },
}
