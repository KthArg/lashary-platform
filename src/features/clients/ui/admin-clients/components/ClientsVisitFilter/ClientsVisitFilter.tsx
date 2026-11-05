'use client'

import { useClientsListQuery } from '../../hooks/useClientsListQuery'
import { CLIENTS_VISIT_FILTER_TEXTS } from '../../constants/client-strings'
import { clientsVisitFilterStyles as STYLES } from './ClientsVisitFilter.styles'
import type { ClientsVisitFilterProps } from './ClientsVisitFilter.types'

const readField = (form: FormData, field: string): string => {
  const value = form.get(field)
  return typeof value === 'string' ? value : ''
}

export function ClientsVisitFilter({ visitFrom = '', visitTo = '' }: ClientsVisitFilterProps) {
  const { navigateWith } = useClientsListQuery()

  const applyRange = (nextFrom: string, nextTo: string) =>
    navigateWith({ visitFrom: nextFrom, visitTo: nextTo, page: null })

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    applyRange(readField(form, 'visitFrom'), readField(form, 'visitTo'))
  }

  return (
    <form className={STYLES.form} onSubmit={onSubmit} role="search" aria-label={CLIENTS_VISIT_FILTER_TEXTS.formLabel}>
      <div className={STYLES.field}>
        <label className={STYLES.label} htmlFor="clients-visit-from">{CLIENTS_VISIT_FILTER_TEXTS.fromLabel}</label>
        <input id="clients-visit-from" name="visitFrom" type="date" defaultValue={visitFrom} key={visitFrom}
          className={STYLES.input} />
      </div>
      <div className={STYLES.field}>
        <label className={STYLES.label} htmlFor="clients-visit-to">{CLIENTS_VISIT_FILTER_TEXTS.toLabel}</label>
        <input id="clients-visit-to" name="visitTo" type="date" defaultValue={visitTo} key={visitTo}
          className={STYLES.input} />
      </div>
      <button type="submit" className={STYLES.submitButton}>{CLIENTS_VISIT_FILTER_TEXTS.submit}</button>
      {visitFrom || visitTo ? (
        <button type="button" className={STYLES.clearButton} onClick={() => applyRange('', '')}>
          {CLIENTS_VISIT_FILTER_TEXTS.clear}
        </button>
      ) : null}
    </form>
  )
}
