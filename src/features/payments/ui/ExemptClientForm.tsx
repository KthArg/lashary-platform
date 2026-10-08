'use client'

import { useActionState, useState, useTransition } from 'react'
import type { ClientRecord } from '@/features/clients'
import { paymentsMessages } from './messages'
import { exemptClientAction, searchClientsAction } from './actions'
import { initialExemptClientActionState } from './action-state'
import { exemptClientFormStyles as STYLES } from './exempt-client-form.styles'

const m = paymentsMessages.exemption

function Feedback({
  status,
  message,
  problems,
}: {
  status: string
  message?: string
  problems?: string[]
}) {
  if (status === 'idle') return null
  if (status === 'ok') {
    return (
      <div role="status" className={STYLES.alertSuccess}>
        <span>{message}</span>
      </div>
    )
  }
  if (status === 'forbidden' || status === 'conflict') {
    return (
      <div role="alert" className={STYLES.alertWarning}>
        <span>{message}</span>
      </div>
    )
  }
  return (
    <div role="alert" className={STYLES.alertError}>
      <div>
        <p className={STYLES.feedbackTitle}>{m.validationTitle}</p>
        <ul className={STYLES.feedbackList}>
          {(problems ?? []).map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

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
      <h2 className={STYLES.heading}>{m.title}</h2>
      <p className={STYLES.subtitle}>{m.subtitle}</p>

      {showFeedback && <Feedback {...state} />}

      <div className={STYLES.searchRow}>
        <label className={STYLES.fieldLabel} htmlFor="client-search">
          <span className={STYLES.labelText}>{m.searchLabel}</span>
          <input
            id="client-search"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={m.searchPlaceholder}
            className={STYLES.fieldInput}
          />
        </label>
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || query.trim().length === 0}
          className={STYLES.searchButton}
        >
          {searching ? m.searching : m.searchLabel}
        </button>
      </div>

      {!exempted && (
        <div aria-live="polite">
          {searched && !searching && searchFailed && (
            <p role="alert" className={STYLES.alertError}>
              {m.searchFailed}
            </p>
          )}
          {searched && !searching && !searchFailed && results.length === 0 && (
            <p className={STYLES.statusText}>{m.noResults}</p>
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
            {m.selected}: <strong>{selected.fullName}</strong>
          </p>

          <label className={STYLES.fieldLabel} htmlFor="reason">
            <span className={STYLES.labelText}>{m.reasonLabel}</span>
            <textarea id="reason" name="reason" required rows={2} className={STYLES.textarea} />
          </label>

          <button type="submit" disabled={pending} className={STYLES.submitButton}>
            {m.submit}
          </button>
        </form>
      )}
    </section>
  )
}
