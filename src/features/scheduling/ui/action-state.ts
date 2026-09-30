export type SchedulingActionState = {
  status: 'idle' | 'ok' | 'invalid' | 'forbidden'
  message?: string
  problems?: string[]
}

export const initialActionState: SchedulingActionState = { status: 'idle' }
