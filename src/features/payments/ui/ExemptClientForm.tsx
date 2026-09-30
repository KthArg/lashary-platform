'use client'

import { useActionState, useState, useTransition } from 'react'
import type { ClientRecord } from '@/features/clients'
import { paymentsMessages } from './messages'
import { exemptClientAction, searchClientsAction } from './actions'
import { initialExemptClientActionState } from './action-state'
import { exemptClientFormStyles as Styles } from './exempt-client-form.styles'

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
      <div role="status" className={Styles.alertSuccess}>
        <span>{message}</span>
      </div>
    )
  }
  if (status === 'forbidden' || status === 'conflict') {
    return (
      <div role="alert" className={Styles.alertWarning}>
        <span>{message}</span>
      </div>
    )
  }
  return (
    <div role="alert" className={Styles.alertError}>
      <div>
        <p className={Styles.feedbackTitle}>{m.validationTitle}</p>
        <ul className={Styles.feedbackList}>
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
    <section className={Styles.section}>
      <h2 className={Styles.heading}>{m.title}</h2>
      <p className={Styles.subtitle}>{m.subtitle}</p>

      {showFeedback && <Feedback {...state} />}

      <div className={Styles.searchRow}>
        <label className={Styles.fieldLabel} htmlFor="client-search">
          <span className={Styles.labelText}>{m.searchLabel}</span>
          <input
            id="client-search"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={m.searchPlaceholder}
            className={Styles.fieldInput}
          />
        </label>
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || query.trim().length === 0}
          className={Styles.searchButton}
        >
          {searching ? m.searching : m.searchLabel}
        </button>
      </div>

      {!exempted && (
        <div aria-live="polite">
          {searched && !searching && searchFailed && (
            <p role="alert" className={Styles.alertError}>
              {m.searchFailed}
            </p>
          )}
          {searched && !searching && !searchFailed && results.length === 0 && (
            <p className={Styles.statusText}>{m.noResults}</p>
          )}
        </div>
      )}

      {!exempted && results.length > 0 && (
        <ul className={Styles.resultsList}>
          {results.map((client) => (
            <li key={client.id}>
              <button
                type="button"
                aria-pressed={selected?.id === client.id}
                onClick={() => setSelected(client)}
                className={selected?.id === client.id ? Styles.resultSelected : Styles.result}
              >
                {client.fullName} — {client.phone}
              </button>
            </li>
          ))}
        </ul>
      )}

      {!exempted && selected && (
        <form action={formAction} className={Styles.form}>
          <input type="hidden" name="clientId" value={selected.id} />
          <p className={Styles.selectedLine}>
            {m.selected}: <strong>{selected.fullName}</strong>
          </p>

          <label className={Styles.fieldLabel} htmlFor="reason">
            <span className={Styles.labelText}>{m.reasonLabel}</span>
            <textarea id="reason" name="reason" required rows={2} className={Styles.textarea} />
          </label>

          <button type="submit" disabled={pending} className={Styles.submitButton}>
            {m.submit}
          </button>
        </form>
      )}
    </section>
  )
}
