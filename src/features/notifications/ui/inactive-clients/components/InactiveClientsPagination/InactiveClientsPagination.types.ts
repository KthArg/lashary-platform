import type { InactiveRangeDays } from '@/features/notifications/domain/inactive-reminder'

export type InactiveClientsPaginationProps = {
  rangeDays: InactiveRangeDays
  page: number
  pageSize: number
  total: number
}
