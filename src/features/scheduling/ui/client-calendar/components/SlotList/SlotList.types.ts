import type { SlotView } from '../../types/client-calendar.types'

export interface SlotListProps {
  slots: SlotView[]
  serviceKey: string
  date: string
}
