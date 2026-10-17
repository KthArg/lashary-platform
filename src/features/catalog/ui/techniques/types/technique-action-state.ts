export type TechniqueActionState = {
  status: 'idle' | 'ok' | 'invalid' | 'forbidden'
  message?: string
  problems?: string[]
}

export const initialActionState: TechniqueActionState = { status: 'idle' }
