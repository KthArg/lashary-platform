export type AvailabilityActionState = {
  status: 'idle' | 'ok' | 'invalid' | 'forbidden' | 'conflict'
  message?: string
  problems?: string[]
}

export const initialAvailabilityActionState: AvailabilityActionState = { status: 'idle' }
