import { addCalendarDays } from '@/shared/studio-time'
import type { DaySlot } from '../../../domain/day-slots'
import type { ServiceOption } from '../../../domain/service-option'
import { clientCalendarMessages } from '../constants/client-calendar-strings'
import { formatCalendarDate, minutesToTime } from '../../availability/utils/availability-format'
import { calendarHref } from './calendar-params'
import type {
  ClientCalendarData,
  CalendarView,
  DayView,
  ServicePickerView,
  SlotView,
} from '../types/client-calendar.types'

const m = clientCalendarMessages

const toSlotViews = (slots: readonly DaySlot[]): SlotView[] =>
  slots.map((slot) => ({
    startMin: slot.startMin,
    range: `${minutesToTime(slot.startMin)}–${minutesToTime(slot.endMin)}`,
    busy: slot.status === 'busy',
  }))

const toPicker = (options: readonly ServiceOption[], date: string, selectedKey?: string): ServicePickerView => ({
  date,
  selectedKey,
  options: options.map((option) => ({
    key: option.key,
    label: m.serviceOption(option.name, option.isFirstTime, option.durationMin),
  })),
})

const toDay = (date: string, today: string, serviceKey: string): DayView => ({
  title: formatCalendarDate(date),
  previousHref: date > today ? calendarHref({ serviceKey, date: addCalendarDays(date, -1) }) : null,
  nextHref: calendarHref({ serviceKey, date: addCalendarDays(date, 1) }),
})

export function toCalendarView(data: ClientCalendarData): CalendarView {
  switch (data.status) {
    case 'forbidden':
    case 'noServices':
      return { status: data.status }
    case 'chooseService':
      return { status: 'chooseService', picker: toPicker(data.options, data.date) }
    case 'invalid':
      return {
        status: 'invalid',
        picker: toPicker(data.options, data.date, data.selected.key),
        day: toDay(data.date, data.today, data.selected.key),
      }
    case 'ready':
      return {
        status: 'ready',
        picker: toPicker(data.options, data.date, data.selected.key),
        day: toDay(data.date, data.today, data.selected.key),
        slots: toSlotViews(data.slots),
      }
  }
}
