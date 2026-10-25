import { randomUUID } from 'node:crypto'
import { systemClock } from '@/shared/clock'
import { createClient } from '@/shared/lib/supabase/server'
import { addCalendarDays, studioLocalToUtc } from '@/shared/studio-time'
import { DEFAULT_RESOURCE_ID } from '../../../application/availability-ports'
import { addWeeklyBlock, listWeeklyBlocks, removeWeeklyBlock } from '../../../application/weekly-availability'
import { addClosedDate, listUpcomingClosedDates, removeClosedDate } from '../../../application/closed-dates'
import {
  addManualBlock,
  blockSlots,
  listUpcomingManualBlocks,
  releaseSlots,
  removeManualBlock,
} from '../../../application/manual-blocks'
import { getPickerSlots } from '../../../application/picker-slots'
import { dayAvailabilityRepository } from '../../../db/day-availability-repository'
import { weeklyAvailabilityRepository } from '../../../db/weekly-availability-repository'
import { closedDateRepository } from '../../../db/closed-date-repository'
import { manualBlockRepository } from '../../../db/manual-block-repository'
import { createSupabaseAffectedAppointmentsRepository } from '../../../db/affected-appointments-repository'

// Composición de los casos de uso de disponibilidad con sus adaptadores reales. Siempre sobre el
// recurso por defecto: la UI no ofrece selector mientras exista uno solo (ADR-0005).
const newId = () => randomUUID()
const resourceId = DEFAULT_RESOURCE_ID

export const availabilityService = {
  async loadAll() {
    const [weekly, closed, blocks] = await Promise.all([
      weeklyAvailabilityRepository(),
      closedDateRepository(),
      manualBlockRepository(),
    ])
    const [weeklyBlocks, closedDates, manualBlocks] = await Promise.all([
      listWeeklyBlocks({ repo: weekly })(resourceId),
      listUpcomingClosedDates({ repo: closed, clock: systemClock })(resourceId),
      listUpcomingManualBlocks({ repo: blocks, clock: systemClock })(resourceId),
    ])
    return { weeklyBlocks, closedDates, manualBlocks }
  },

  async addWeeklyBlock(input: { weekday: number; startMin: number; endMin: number }) {
    return addWeeklyBlock({ repo: await weeklyAvailabilityRepository(), newId })({ resourceId, ...input })
  },

  async removeWeeklyBlock(id: string) {
    return removeWeeklyBlock({ repo: await weeklyAvailabilityRepository() })(id)
  },

  async addClosedDate(input: { date: string; kind: string; label: string | null }) {
    return addClosedDate({ repo: await closedDateRepository(), newId })({ resourceId, ...input })
  },

  async removeClosedDate(id: string) {
    return removeClosedDate({ repo: await closedDateRepository() })(id)
  },

  async countAffectedByWeeklyBlock(blockId: string) {
    return createSupabaseAffectedAppointmentsRepository(await createClient()).countByWeeklyBlock(blockId)
  },

  async countAffectedOnDate(date: string) {
    return this.countAffectedInRange(studioLocalToUtc(date, 0), studioLocalToUtc(addCalendarDays(date, 1), 0))
  },

  async countAffectedInRange(startsAt: Date, endsAt: Date) {
    return createSupabaseAffectedAppointmentsRepository(await createClient()).countInRange({
      resourceId,
      fromMs: startsAt.getTime(),
      toMs: endsAt.getTime(),
    })
  },

  async addManualBlock(input: { startsAt: Date; endsAt: Date; reason: string | null }) {
    return addManualBlock({ repo: await manualBlockRepository(), newId })({ resourceId, ...input })
  },

  async loadPickerSlots(date: string) {
    return getPickerSlots({
      day: await dayAvailabilityRepository(),
      blocks: await manualBlockRepository(),
      clock: systemClock,
    })(resourceId, date)
  },

  async releaseSlots(input: { date: string; slotStartMinutes: number[] }) {
    return releaseSlots({ repo: await manualBlockRepository(), day: await dayAvailabilityRepository() })({
      resourceId,
      ...input,
    })
  },

  async blockSlots(input: { date: string; slotStartMinutes: number[]; reason: string | null }) {
    return blockSlots({
      repo: await manualBlockRepository(),
      day: await dayAvailabilityRepository(),
      newId,
      clock: systemClock,
    })({ resourceId, ...input })
  },

  async removeManualBlock(id: string) {
    return removeManualBlock({ repo: await manualBlockRepository() })(id)
  },
}
