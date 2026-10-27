import { AUTH_ROLES, getAuthSession } from '@/features/auth'
import { systemClock } from '@/shared/clock'
import { createClient } from '@/shared/lib/supabase/server'
import { listMyAppointments } from '../../../application/list-my-appointments'
import { createSupabaseMyAppointmentsRepository } from '../../../db/my-appointments-repository'
import { loadMyAppointments } from '../utils/load-my-appointments'
import { toMyAppointmentsView } from '../utils/my-appointments-format'
import type { MyAppointmentsScreen } from '../types/my-appointments.types'

export const myAppointmentsService = {
  async load(): Promise<MyAppointmentsScreen> {
    const data = await loadMyAppointments({
      isClient: async () => {
        const session = await getAuthSession()
        return Boolean(session?.user) && session?.role === AUTH_ROLES.CLIENTE
      },
      list: async () =>
        listMyAppointments({
          appointments: createSupabaseMyAppointmentsRepository(await createClient()),
          clock: systemClock,
        }),
    })
    return toMyAppointmentsView(data)
  },
}
