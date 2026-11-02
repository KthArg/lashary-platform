import { AUTH_ROLES, getAuthSession } from '@/features/auth'
import { systemClock } from '@/shared/clock'
import { createClient } from '@/shared/lib/supabase/server'
import { DEFAULT_RESOURCE_ID } from '../../../application/availability-ports'
import { quoteReschedule } from '../../../application/reschedule-appointment'
import { dayAvailabilityRepository } from '../../../db/day-availability-repository'
import { createSupabaseRescheduleRepository } from '../../../db/reschedule-repository'
import { loadReschedulePage } from '../utils/load-reschedule-page'
import { toRescheduleView } from '../utils/reschedule-page-format'
import type { RescheduleSearchParams } from '../types/reschedule-page.types'
import type { RescheduleView } from '../types/reschedule-view.types'

export const reschedulePageService = {
  async load(appointmentId: string, searchParams: RescheduleSearchParams): Promise<RescheduleView> {
    const data = await loadReschedulePage(appointmentId, searchParams, {
      isClient: async () => {
        const session = await getAuthSession()
        return Boolean(session?.user) && session?.role === AUTH_ROLES.CLIENTE
      },
      quote: quoteReschedule(createSupabaseRescheduleRepository(await createClient())),
      repo: await dayAvailabilityRepository(),
      clock: systemClock,
      resourceId: DEFAULT_RESOURCE_ID,
    })
    return toRescheduleView(data, appointmentId)
  },
}
