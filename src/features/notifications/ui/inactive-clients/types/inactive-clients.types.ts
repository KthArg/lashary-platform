import type { InactiveClientsView } from '@/features/notifications/application/inactive-clients'
import type { InactiveRangeDays } from '@/features/notifications/domain/inactive-reminder'

export type InactiveClientsSearchParams = { rango?: string | string[]; pagina?: string | string[] }

export type InactiveClientsScreen =
  | { status: 'ready'; view: InactiveClientsView }
  | { status: 'error'; rangeDays: InactiveRangeDays; page: number }

export type InactiveClientsLocation = { rangeDays: InactiveRangeDays; page: number }
