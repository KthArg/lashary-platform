export interface ProductActionState {
  status: 'idle' | 'ok' | 'invalid' | 'forbidden'
  message?: string
  problems?: string[]
}

export const initialProductActionState: ProductActionState = { status: 'idle' }
