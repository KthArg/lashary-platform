import type { PickerSlotStatus } from '@/features/scheduling/domain/manual-block-selection'

export type AvailabilitySearchParams = Record<string, string | string[] | undefined>

export interface SlotPickerSlotView {
  startMin: number
  range: string
  status: PickerSlotStatus
}

export interface SlotPickerView {
  date: string
  dateLabel: string
  slots: SlotPickerSlotView[]
}
