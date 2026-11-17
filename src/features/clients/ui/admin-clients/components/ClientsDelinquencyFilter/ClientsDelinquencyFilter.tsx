'use client'

import { useClientsListQuery } from '../../hooks/useClientsListQuery'
import { CLIENTS_DELINQUENCY_FILTER_TEXTS } from '../../constants/client-strings'
import { DELINQUENCY_FILTER_VALUES } from '../../../../domain/list/delinquency-filter'
import { clientsDelinquencyFilterStyles as STYLES } from './ClientsDelinquencyFilter.styles'
import type { ClientsDelinquencyFilterProps } from './ClientsDelinquencyFilter.types'

export function ClientsDelinquencyFilter({ delinquency = '' }: ClientsDelinquencyFilterProps) {
  const { navigateWith } = useClientsListQuery()

  const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const field = new FormData(event.currentTarget).get('delinquency')
    navigateWith({ delinquency: typeof field === 'string' ? field : '', page: null })
  }

  return (
    <form className={STYLES.form} onSubmit={onSubmit} role="search" aria-label={CLIENTS_DELINQUENCY_FILTER_TEXTS.formLabel}>
      <div className={STYLES.field}>
        <label className={STYLES.label} htmlFor="clients-delinquency-filter">
          {CLIENTS_DELINQUENCY_FILTER_TEXTS.selectLabel}
        </label>
        <select id="clients-delinquency-filter" name="delinquency" defaultValue={delinquency} key={delinquency}
          className={STYLES.input}>
          <option value="">{CLIENTS_DELINQUENCY_FILTER_TEXTS.allOption}</option>
          {DELINQUENCY_FILTER_VALUES.map((value) => (
            <option key={value} value={value}>{CLIENTS_DELINQUENCY_FILTER_TEXTS.options[value]}</option>
          ))}
        </select>
      </div>
      <button type="submit" className={STYLES.submitButton}>{CLIENTS_DELINQUENCY_FILTER_TEXTS.submit}</button>
    </form>
  )
}
