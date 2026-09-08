'use client'

import { useCallback, useMemo, useState } from 'react'
import { EMPTY_CLIENT_FORM_VALUES, type ClientFieldKey } from '../constants/client-form'
import { CLIENTS_CONSOLE_MESSAGES } from '../constants/clients-strings'
import { hasClientFormErrors, validateClientForm } from '../validation/validate-client-form'
import type { ClientFormErrors, ClientFormValues } from '../types/client-form.types'

export function useAddClientForm(onCreated?: () => void) {
  const [values, setValues] = useState<ClientFormValues>({ ...EMPTY_CLIENT_FORM_VALUES })
  const [errors, setErrors] = useState<ClientFormErrors>({})
  const [wasSubmitted, setWasSubmitted] = useState(false)

  const isDirty = useMemo(
    () => Object.values(values).some((value) => value.trim().length > 0),
    [values],
  )

  const setFieldValue = useCallback((field: ClientFieldKey, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    setErrors((current) => (current[field] ? { ...current, [field]: undefined } : current))
  }, [])

  const reset = useCallback(() => {
    setValues({ ...EMPTY_CLIENT_FORM_VALUES })
    setErrors({})
    setWasSubmitted(false)
  }, [])

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setWasSubmitted(true)
      const nextErrors = validateClientForm(values)
      setErrors(nextErrors)
      if (hasClientFormErrors(nextErrors)) return
      // US-CLI-05 criterio 1: por ahora solo se reporta; la persistencia llega con la migracion.
      console.log(CLIENTS_CONSOLE_MESSAGES.clientCreated, values)
      reset()
      onCreated?.()
    },
    [values, reset, onCreated],
  )

  return { values, errors, wasSubmitted, isDirty, setFieldValue, handleSubmit, reset }
}
