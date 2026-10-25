'use client'
import { useActionState } from 'react'
import { updateClientPhoneAction } from '../../actions/phone-actions'
import type { PhoneRegistrationState } from '../types/phone-registration.types'

export function usePhoneRegistration() {
  const [state, formAction, isPending] = useActionState<PhoneRegistrationState | null, FormData>(
    async (_previousState, formData) => updateClientPhoneAction(formData),
    null,
  )
  return { state, formAction, isPending }
}
