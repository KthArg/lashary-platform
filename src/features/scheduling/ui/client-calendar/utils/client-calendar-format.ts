import { addCalendarDays } from '@/shared/studio-time'
import type { DaySlot } from '../../../domain/day-slots'
import type { ServiceOption } from '../../../domain/service-option'
import { schedulingMessages } from '../../messages'
import { formatCalendarDate, minutesToTime } from '../../availability/utils/availability-format'
import { calendarHref } from './calendar-params'
import type {
  ClientCalendarData,
  ClientCalendarView,
  DayView,
  ServicePickerView,
  SlotView,
} from '../types/client-calendar.types'

// Vista ya formateada en el servidor, como utils/availability-format.ts: la vista solo pinta.

const m = schedulingMessages.clientCalendar

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

// No se ofrece ir a un día anterior a hoy.
const toDay = (date: string, today: string, serviceKey: string): DayView => ({
  title: formatCalendarDate(date),
  previousHref: date > today ? calendarHref({ serviceKey, date: addCalendarDays(date, -1) }) : null,
  nextHref: calendarHref({ serviceKey, date: addCalendarDays(date, 1) }),
})

export function toClientCalendarView(data: ClientCalendarData): ClientCalendarView {
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
