import { requireAdminSession } from '@/features/auth'
import { isOk } from '@/shared/result'
import { systemClock } from '@/shared/clock'
import { studioDateOf } from '@/shared/studio-time'
import { availabilityService } from '../services/availability-service'
import { toClosedDateViews, toManualBlockViews, toSlotPickerView, toWeeklyDays } from '../utils/availability-format'
import { readSlotPickerDate } from '../utils/slot-picker-date'
import type { AvailabilitySearchParams } from '../types/slot-picker.types'
import { AdminAvailabilityView } from './AdminAvailabilityView'

export async function AdminAvailabilityPage({ searchParams }: { searchParams: AvailabilitySearchParams }) {
  await requireAdminSession()
  const slotPickerDate = readSlotPickerDate(searchParams, studioDateOf(systemClock()))
  const [{ weeklyBlocks, closedDates, manualBlocks }, daySlots] = await Promise.all([
    availabilityService.loadAll(),
    availabilityService.loadDaySlots(slotPickerDate),
  ])

  return (
    <AdminAvailabilityView
      weeklyDays={toWeeklyDays(weeklyBlocks)}
      closedDates={toClosedDateViews(closedDates)}
      manualBlocks={toManualBlockViews(manualBlocks)}
      slotPicker={toSlotPickerView(slotPickerDate, isOk(daySlots) ? daySlots.value : [])}
    />
  )
}
