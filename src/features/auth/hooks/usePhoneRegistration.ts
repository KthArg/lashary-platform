'use client'
import { useActionState } from 'react'
import { updateClientPhoneAction } from '../actions/phone-actions'
export function usePhoneRegistration() {
  const [state, formAction, isPending] = useActionState(async (_: any, fd: FormData) => updateClientPhoneAction(fd), null)
  return { state, formAction, isPending }
}
