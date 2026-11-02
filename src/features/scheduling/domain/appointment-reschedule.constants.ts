export const RESCHEDULE_BLOCKS = ['outside_window', 'limit_reached'] as const

export type RescheduleBlock = (typeof RESCHEDULE_BLOCKS)[number]
