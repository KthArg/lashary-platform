'use client'

import { useCallback, useMemo, useState } from 'react'
import { CLIENT_FIELD_KEYS, type ClientFieldKey } from '../constants/client-form'
import { hasClientFormErrors, validateClientForm } from '../validation/validate-client-form'
import type { ClientFormErrors, ClientFormValues } from '../types/client-form.types'

const FIELD_KEYS = Object.values(CLIENT_FIELD_KEYS)

/**
 * Estado del formulario de clienta, para alta y para edicion.
 *
 * `isDirty` compara contra los valores INICIALES, no contra el vacio. En el alta da lo mismo
 * —nace vacio, cualquier letra ensucia—, pero en la edicion nace lleno: medir "hay algo escrito"
 * haria que abrir y cancelar sin tocar nada dispare la confirmacion de descarte, que mentiria.
 */
export function useClientForm(initialValues: ClientFormValues, onSubmitted?: (values: ClientFormValues) => void) {
  const [values, setValues] = useState<ClientFormValues>({ ...initialValues })
  const [errors, setErrors] = useState<ClientFormErrors>({})
  const [wasSubmitted, setWasSubmitted] = useState(false)

  const isDirty = useMemo(
    () => FIELD_KEYS.some((field) => values[field].trim() !== initialValues[field].trim()),
    [values, initialValues],
  )

  const setFieldValue = useCallback((field: ClientFieldKey, value: string) => {
    setValues((current) => ({ ...current, [field]: value }))
    // La clave se BORRA, no se pone en undefined: Object.keys seguiria contandola
    // y el banner de resumen no se limpiaria nunca.
    setErrors((current) => {
      if (!current[field]) return current
      const { [field]: _corregido, ...rest } = current
      return rest
    })
  }, [])

  const handleSubmit = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      setWasSubmitted(true)
      const nextErrors = validateClientForm(values)
      setErrors(nextErrors)
      if (hasClientFormErrors(nextErrors)) return
      onSubmitted?.(values)
    },
    [values, onSubmitted],
  )

  return { values, errors, wasSubmitted, isDirty, setFieldValue, handleSubmit }
}
