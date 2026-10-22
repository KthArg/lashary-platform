export const CANCELLABLE_STATUSES = ['pending_approval', 'approved', 'confirmed'] as const

export type CancellableStatus = (typeof CANCELLABLE_STATUSES)[number]
