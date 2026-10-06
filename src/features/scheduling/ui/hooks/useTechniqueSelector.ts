'use client'

import { useActionState } from 'react'
import { selectTechniqueAction } from '../actions'
import { initialSelectTechniqueState } from '../action-state'

export function useTechniqueSelector() {
  const [state, formAction, pending] = useActionState(
    selectTechniqueAction,
    initialSelectTechniqueState,
  )

  return { state, formAction, pending }
}
