import type { CancellableStatus } from '../../../domain/appointment-cancellation.constants'
import type { DayView, SlotView } from '../../client-calendar/types/client-calendar.types'

export type RescheduleSlotView = SlotView & { startsAtMs: number }

export type RescheduleView =
  | { status: 'forbidden' }
  | { status: 'notReschedulable' }
  | { status: 'failed' }
  | { status: 'blocked'; current: string; message: string }
  | { status: 'invalid'; current: string; day: DayView }
  | {
      status: 'ready'
      appointmentId: string
      expectedStatus: CancellableStatus
      current: string
      remaining: string
      consequence: string
      day: DayView
      slots: RescheduleSlotView[]
    }
