export type AvailabilitySearchParams = Record<string, string | string[] | undefined>

export interface SlotPickerSlotView {
  startMin: number
  range: string
  busy: boolean
}

export interface SlotPickerView {
  date: string
  dateLabel: string
  slots: SlotPickerSlotView[]
}
