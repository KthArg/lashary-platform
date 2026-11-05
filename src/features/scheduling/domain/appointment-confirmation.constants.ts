import { HOURS_PER_DAY } from './cancellation-window.constants'

export const MIN_CONFIRMATION_DEADLINE_HOURS = 0

export const MAX_CONFIRMATION_DEADLINE_DAYS = 30

export const MAX_CONFIRMATION_DEADLINE_HOURS = MAX_CONFIRMATION_DEADLINE_DAYS * HOURS_PER_DAY

export const CONFIRMABLE_STATUS = 'approved'

export const MS_PER_HOUR = 3_600_000
