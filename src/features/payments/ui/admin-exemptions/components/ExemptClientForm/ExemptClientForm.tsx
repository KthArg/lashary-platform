'use client'

import { useActionState, useState, useTransition } from 'react'
import type { ClientRecord } from '@/features/clients'
import { exemptionMessages } from '../../constants/exemption-strings'
import { exemptClientAction, searchClientsAction } from '../../actions/exemption-actions'
import { initialExemptClientActionState } from '../../types/exempt-client-action-state'
import { ExemptClientFeedback } from '../ExemptClientFeedback'
import { exemptClientFormStyles as STYLES } from './ExemptClientForm.styles'

export function ExemptClientForm() {
  const [state, formAction, pending] = useActionState(
    exemptClientAction,
    initialExemptClientActionState,
  )
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ClientRecord[]>([])
  const [searched, setSearched] = useState(false)
  const [searchFailed, setSearchFailed] = useState(false)
  const [selected, setSelected] = useState<ClientRecord | null>(null)
  const [searching, startSearch] = useTransition()
  const [dismissedState, setDismissedState] = useState(state)

  const showFeedback = state !== dismissedState
  const exempted = showFeedback && state.status === 'ok'

  function handleSearch() {
    setDismissedState(state)
    startSearch(async () => {
      const found = await searchClientsAction(query)
      setSearchFailed(!found.ok)
      setResults(found.ok ? found.clients : [])
      setSearched(true)
      setSelected(null)
    })
  }

  return (
    <section className={STYLES.section}>
      <h2 className={STYLES.heading}>{exemptionMessages.title}</h2>
      <p className={STYLES.subtitle}>{exemptionMessages.subtitle}</p>

      {showFeedback && <ExemptClientFeedback {...state} />}

      <div className={STYLES.searchRow}>
        <label className={STYLES.fieldLabel} htmlFor="client-search">
          <span className={STYLES.labelText}>{exemptionMessages.searchLabel}</span>
          <input
            id="client-search"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={exemptionMessages.searchPlaceholder}
            className={STYLES.fieldInput}
          />
        </label>
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || query.trim().length === 0}
          className={STYLES.searchButton}
        >
          {searching ? exemptionMessages.searching : exemptionMessages.searchLabel}
        </button>
      </div>

      {!exempted && (
        <div aria-live="polite">
          {searched && !searching && searchFailed && (
            <p role="alert" className={STYLES.alertError}>
              {exemptionMessages.searchFailed}
            </p>
          )}
          {searched && !searching && !searchFailed && results.length === 0 && (
            <p className={STYLES.statusText}>{exemptionMessages.noResults}</p>
          )}
        </div>
      )}

      {!exempted && results.length > 0 && (
        <ul className={STYLES.resultsList}>
          {results.map((client) => (
            <li key={client.id}>
              <button
                type="button"
                aria-pressed={selected?.id === client.id}
                onClick={() => setSelected(client)}
                className={selected?.id === client.id ? STYLES.resultSelected : STYLES.result}
              >
                {client.fullName} — {client.phone}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!exempted && selected && (
        <form action={formAction} className={STYLES.form}>
          <input type="hidden" name="clientId" value={selected.id} />
          <p className={STYLES.selectedLine}>
            {exemptionMessages.selected}: <strong>{selected.fullName}</strong>
          </p>

          <label className={STYLES.fieldLabel} htmlFor="reason">
            <span className={STYLES.labelText}>{exemptionMessages.reasonLabel}</span>
            <textarea id="reason" name="reason" required rows={2} className={STYLES.textarea} />
          </label>

          <button type="submit" disabled={pending} className={STYLES.submitButton}>
            {exemptionMessages.submit}
          </button>
        </form>
      )}
    </section>
  )
}
