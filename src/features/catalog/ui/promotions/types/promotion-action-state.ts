export type PromotionActionState = {
  status: 'idle' | 'ok' | 'invalid' | 'forbidden'
  message?: string
  problems?: string[]
}

export const initialPromotionActionState: PromotionActionState = { status: 'idle' }
