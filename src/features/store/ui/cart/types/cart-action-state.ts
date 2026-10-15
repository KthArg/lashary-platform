export interface CartActionState {
  status: 'idle' | 'ok' | 'invalid' | 'unavailable' | 'unauthenticated'
  message?: string
}

export const initialCartActionState: CartActionState = { status: 'idle' }
