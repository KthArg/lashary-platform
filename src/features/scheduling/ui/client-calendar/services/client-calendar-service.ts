import { AUTH_ROLES, getAuthSession } from '@/features/auth'
import { listTechniques } from '@/features/catalog'
import { systemClock } from '@/shared/clock'
import { DEFAULT_RESOURCE_ID } from '../../../application/availability-ports'
import { dayAvailabilityRepository } from '../../../db/day-availability-repository'
import { MAX_CALENDAR_SERVICES } from '../constants/client-calendar.constants'
import { loadClientCalendar } from '../utils/load-client-calendar'
import { toClientCalendarView } from '../utils/client-calendar-format'
import type { CalendarSearchParams, ClientCalendarView } from '../types/client-calendar.types'

// Composición del calendario de la clienta con sus adaptadores reales, como
// ui/availability/services/availability-service.ts. Siempre sobre el recurso por defecto (ADR-0005).
export const clientCalendarService = {
  async load(searchParams: CalendarSearchParams): Promise<ClientCalendarView> {
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
    return toClientCalendarView(data)
  },
}
