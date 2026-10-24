import type { RescheduleQuote } from '../../../application/ports'
import type { DaySlot } from '../../../domain/day-slots'

export type RescheduleSearchParams = Record<string, string | string[] | undefined>

export type ReschedulePageData =
  | { status: 'forbidden' }
  | { status: 'notReschedulable' }
  | { status: 'failed' }
  | { status: 'blocked'; quote: RescheduleQuote }
  | { status: 'invalid'; quote: RescheduleQuote; date: string; today: string }
  | { status: 'ready'; quote: RescheduleQuote; date: string; today: string; slots: DaySlot[] }
