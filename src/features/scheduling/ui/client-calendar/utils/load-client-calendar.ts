import { isErr } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { studioDateOf } from '@/shared/studio-time'
import { getDaySlots } from '../../../application/day-slots'
import type { DayAvailabilityRepository } from '../../../application/availability-ports'
import { findServiceOption, serviceOptionsOf, type NamedTechnique } from '../../../domain/service-option'
import { readCalendarParams } from './calendar-params'
import type { CalendarSearchParams, ClientCalendarData } from '../types/client-calendar.types'

export type ClientCalendarDeps = {
  isClient: () => Promise<boolean>
  listTechniques: () => Promise<readonly NamedTechnique[]>
  repo: DayAvailabilityRepository
  clock: Clock
  resourceId: string
}

export async function loadClientCalendar(
  searchParams: CalendarSearchParams,
  deps: ClientCalendarDeps,
): Promise<ClientCalendarData> {
  if (!(await deps.isClient())) return { status: 'forbidden' }

  const options = serviceOptionsOf(await deps.listTechniques())
  if (options.length === 0) return { status: 'noServices' }

  const today = studioDateOf(deps.clock())
  const { serviceKey, date } = readCalendarParams(searchParams, today)
  const base = { options, date, today }
  const selected = findServiceOption(options, serviceKey)
  if (!selected) return { ...base, status: 'chooseService' }

  const slots = await getDaySlots({ repo: deps.repo, clock: deps.clock })({
    resourceId: deps.resourceId,
    date,
    durationMin: selected.durationMin,
  })
  if (isErr(slots)) return { ...base, status: 'invalid', selected }
  return { ...base, status: 'ready', selected, slots: slots.value }
}
