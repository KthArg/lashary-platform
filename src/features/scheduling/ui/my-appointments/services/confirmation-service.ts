import { AUTH_ROLES, getAuthSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { confirmAppointment } from '@/features/scheduling/application/confirm-appointment'
import { createSupabaseAppointmentConfirmationRepository } from '@/features/scheduling/db/appointment-confirmation-repository'
import { performConfirmAppointment } from '../utils/perform-confirmation'
import type { ConfirmAppointmentResult } from '../types/confirmation-results'

export const confirmationService = {
  async confirm(appointmentId: unknown): Promise<ConfirmAppointmentResult> {
    return performConfirmAppointment(appointmentId, {
      isClient: async () => {
        const session = await getAuthSession()
        return Boolean(session?.user) && session?.role === AUTH_ROLES.CLIENTE
      },
      confirm: confirmAppointment(createSupabaseAppointmentConfirmationRepository(await createClient())),
    })
  },
}
