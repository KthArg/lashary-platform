export type AvailabilityActionState = {
  status: 'idle' | 'ok' | 'invalid' | 'forbidden' | 'conflict' | 'needsConfirmation'
  message?: string
  problems?: string[]
  affected?: number
  fields?: Record<string, string>
}

export const initialAvailabilityActionState: AvailabilityActionState = { status: 'idle' }
