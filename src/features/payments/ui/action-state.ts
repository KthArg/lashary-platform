// Estado del server action del formulario. En un módulo aparte porque actions.ts es
// 'use server' y solo puede exportar funciones async.

export type ExemptClientActionState = {
  status: 'idle' | 'ok' | 'invalid' | 'forbidden' | 'conflict'
  message?: string
  problems?: string[]
}

export const initialExemptClientActionState: ExemptClientActionState = { status: 'idle' }
