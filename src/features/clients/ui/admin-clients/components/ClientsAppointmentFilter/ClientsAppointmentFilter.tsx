'use client'

import { useClientsListQuery } from '../../hooks/useClientsListQuery'
import { CLIENTS_APPOINTMENT_FILTER_TEXTS } from '../../constants/client-strings'
import { clientsAppointmentFilterStyles as STYLES } from './ClientsAppointmentFilter.styles'
import type { ClientsAppointmentFilterProps } from './ClientsAppointmentFilter.types'

const readField = (form: FormData, field: string): string => {
  const value = form.get(field)
  return typeof value === 'string' ? value : ''
}

export function ClientsAppointmentFilter({ appointmentFrom = '', appointmentTo = '' }: ClientsAppointmentFilterProps) {
  const { navigateWith } = useClientsListQuery()

  const applyRange = (nextFrom: string, nextTo: string) =>
    navigateWith({ appointmentFrom: nextFrom, appointmentTo: nextTo, page: null })

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    applyRange(readField(form, 'appointmentFrom'), readField(form, 'appointmentTo'))
  }

  return (
    <form className={STYLES.form} onSubmit={onSubmit} role="search" aria-label={CLIENTS_APPOINTMENT_FILTER_TEXTS.formLabel}>
      <div className={STYLES.field}>
        <label className={STYLES.label} htmlFor="clients-appointment-from">{CLIENTS_APPOINTMENT_FILTER_TEXTS.fromLabel}</label>
        <input id="clients-appointment-from" name="appointmentFrom" type="date" defaultValue={appointmentFrom} key={appointmentFrom}
          className={STYLES.input} />
      </div>
      <div className={STYLES.field}>
        <label className={STYLES.label} htmlFor="clients-appointment-to">{CLIENTS_APPOINTMENT_FILTER_TEXTS.toLabel}</label>
        <input id="clients-appointment-to" name="appointmentTo" type="date" defaultValue={appointmentTo} key={appointmentTo}
          className={STYLES.input} />
      </div>
      <button type="submit" className={STYLES.submitButton}>{CLIENTS_APPOINTMENT_FILTER_TEXTS.submit}</button>
      {appointmentFrom || appointmentTo ? (
        <button type="button" className={STYLES.clearButton} onClick={() => applyRange('', '')}>
          {CLIENTS_APPOINTMENT_FILTER_TEXTS.clear}
        </button>
      ) : null}
    </form>
  )
}
