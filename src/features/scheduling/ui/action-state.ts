export type SelectTechniqueActionState = {
  status: 'idle' | 'ok' | 'invalid' | 'forbidden'
  message?: string
  selection?: {
    techniqueId: string
    isFirstTime: boolean
    totalDurationMin: number
  }
}

export const initialSelectTechniqueState: SelectTechniqueActionState = { status: 'idle' }
