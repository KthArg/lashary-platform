import { AUTH_ROLES, getAuthSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { rescheduleAppointment } from '../../../application/reschedule-appointment'
import { createSupabaseRescheduleRepository } from '../../../db/reschedule-repository'
import { performRescheduleAppointment, type RescheduleDeps } from '../utils/perform-reschedule'
import type { RescheduleAppointmentResult } from '../types/reschedule-results'

async function createDeps(): Promise<RescheduleDeps> {
  return {
    isClient: async () => {
      const session = await getAuthSession()
      return Boolean(session?.user) && session?.role === AUTH_ROLES.CLIENTE
    },
    reschedule: rescheduleAppointment(createSupabaseRescheduleRepository(await createClient())),
  }
}

export const rescheduleService = {
  async reschedule(rawRequest: unknown): Promise<RescheduleAppointmentResult> {
    return performRescheduleAppointment(rawRequest, await createDeps())
  },
}
