import { AUTH_ROLES, getAuthSession } from '@/features/auth'
import { listTechniques } from '@/features/catalog'
import { systemClock } from '@/shared/clock'
import { DEFAULT_RESOURCE_ID } from '../../../application/availability-ports'
import { dayAvailabilityRepository } from '../../../db/day-availability-repository'
import { MAX_CALENDAR_SERVICES } from '../constants/client-calendar-strings'
import { loadClientCalendar } from '../utils/load-client-calendar'
import { toCalendarView } from '../utils/client-calendar-format'
import type { CalendarSearchParams, CalendarView } from '../types/client-calendar.types'

export const clientCalendarService = {
  async load(searchParams: CalendarSearchParams): Promise<CalendarView> {
    const data = await loadClientCalendar(searchParams, {
      isClient: async () => {
        const session = await getAuthSession()
        return Boolean(session?.user) && session?.role === AUTH_ROLES.CLIENTE
      },
      listTechniques: async () => (await listTechniques({ activeOnly: true, pageSize: MAX_CALENDAR_SERVICES })).items,
      repo: await dayAvailabilityRepository(),
      clock: systemClock,
      resourceId: DEFAULT_RESOURCE_ID,
    })
    return toCalendarView(data)
  },
}
