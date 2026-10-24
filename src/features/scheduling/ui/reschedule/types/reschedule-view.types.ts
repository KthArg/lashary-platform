import type { DayView, SlotView } from '../../client-calendar/types/client-calendar.types'

export type RescheduleView =
  | { status: 'forbidden' }
  | { status: 'notReschedulable' }
  | { status: 'failed' }
  | { status: 'blocked'; current: string; message: string }
  | { status: 'invalid'; current: string; day: DayView }
  | { status: 'ready'; current: string; remaining: string; day: DayView; slots: SlotView[] }
