export type ConfirmationPolicyScreen = { status: 'ready'; hours: number } | { status: 'error' }

export type ConfirmationPolicyActionState = {
  status: 'idle' | 'ok' | 'invalid' | 'failed'
  message?: string
}

export const initialConfirmationPolicyActionState: ConfirmationPolicyActionState = { status: 'idle' }
