// Estado de los server actions del panel. En un módulo aparte porque actions.ts es
// 'use server' y solo puede exportar funciones async.

export type SchedulingActionState = {
  status: 'idle' | 'ok' | 'invalid' | 'forbidden'
  message?: string
  problems?: string[]
}

export const initialActionState: SchedulingActionState = { status: 'idle' }
