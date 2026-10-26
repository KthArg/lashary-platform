export type AvailabilityActionState = {
  status: 'idle' | 'ok' | 'invalid' | 'forbidden' | 'conflict'
  message?: string
  problems?: string[]
  link?: { href: string; label: string }
}

export const initialAvailabilityActionState: AvailabilityActionState = { status: 'idle' }
