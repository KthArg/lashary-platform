export type CancellationPolicyScreen = { status: 'ready'; hours: number } | { status: 'error' }

export type CancellationPolicyActionState = {
  status: 'idle' | 'ok' | 'invalid' | 'failed' | 'warning' | 'forbidden'
  message?: string
}

export const initialCancellationPolicyActionState: CancellationPolicyActionState = { status: 'idle' }
