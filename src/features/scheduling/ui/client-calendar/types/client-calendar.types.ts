import type { DaySlot } from '../../../domain/day-slots'
import type { ServiceOption } from '../../../domain/service-option'

export type CalendarSearchParams = Record<string, string | string[] | undefined>

export type CalendarParams = {
  readonly serviceKey?: string
  readonly date: string
}

type CalendarBase = {
  options: ServiceOption[]
  date: string
  today: string
}

export type ClientCalendarData =
  | { status: 'forbidden' }
  | { status: 'noServices' }
  | (CalendarBase & { status: 'chooseService' })
  | (CalendarBase & { status: 'invalid'; selected: ServiceOption })
  | (CalendarBase & { status: 'ready'; selected: ServiceOption; slots: DaySlot[] })

export type ServiceOptionView = { key: string; label: string }

export type ServicePickerView = {
  date: string
  options: ServiceOptionView[]
  selectedKey?: string
}

export type DayView = {
  title: string
  previousHref: string | null
  nextHref: string
}

export type SlotView = { startMin: number; range: string; busy: boolean }

export type ClientCalendarView =
  | { status: 'forbidden' }
  | { status: 'noServices' }
  | { status: 'chooseService'; picker: ServicePickerView }
  | { status: 'invalid'; picker: ServicePickerView; day: DayView }
  | { status: 'ready'; picker: ServicePickerView; day: DayView; slots: SlotView[] }
