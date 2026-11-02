export type ReschedulePolicyScreen = { status: 'ready'; max: number } | { status: 'error' }

export type ReschedulePolicyActionState = {
  status: 'idle' | 'ok' | 'invalid' | 'failed'
  message?: string
}

export const initialReschedulePolicyActionState: ReschedulePolicyActionState = { status: 'idle' }
