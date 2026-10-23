export type AvailabilityActionState = {
  status: 'idle' | 'ok' | 'invalid' | 'forbidden' | 'conflict' | 'needsConfirmation'
  message?: string
  problems?: string[]
  affected?: number
  fields?: Record<string, string>
  link?: { href: string; label: string }
}

export const initialAvailabilityActionState: AvailabilityActionState = { status: 'idle' }
