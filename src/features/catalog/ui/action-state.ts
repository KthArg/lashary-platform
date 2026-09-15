// Estado de los server actions del formulario. En un módulo aparte porque actions.ts es
// 'use server' y solo puede exportar funciones async.

export type TechniqueActionState = {
  status: 'idle' | 'ok' | 'invalid' | 'disabled'
  message?: string
  problems?: string[]
}

export const initialActionState: TechniqueActionState = { status: 'idle' }
