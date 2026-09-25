'use client'

import { useActionState, useState, useTransition } from 'react'
import type { ClientRecord } from '@/features/clients'
import { paymentsMessages } from './messages'
import { exemptClientAction, searchClientsAction } from './actions'
import { initialExemptClientActionState } from './action-state'
import { exemptClientFormStyles as s } from './exempt-client-form.styles'

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
      <div role="status" className={s.alertSuccess}>
        <span>{message}</span>
      </div>
    )
  }
  if (status === 'forbidden' || status === 'conflict') {
    return (
      <div role="alert" className={s.alertWarning}>
        <span>{message}</span>
      </div>
    )
  }
  return (
    <div role="alert" className={s.alertError}>
      <div>
        <p className={s.feedbackTitle}>{m.validationTitle}</p>
        <ul className={s.feedbackList}>
          {(problems ?? []).map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// Criterio 5 de US-AGE-13. UI-003: la lista de resultados tiene sus tres estados — cargando
// (searching), vacía (searched && results vacíos) y su versión "sin buscar todavía" (idle).
export function ExemptClientForm() {
  const [state, formAction, pending] = useActionState(
    exemptClientAction,
    initialExemptClientActionState,
  )
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ClientRecord[]>([])
  const [searched, setSearched] = useState(false)
  const [selected, setSelected] = useState<ClientRecord | null>(null)
  const [searching, startSearch] = useTransition()

  function handleSearch() {
    startSearch(async () => {
      const found = await searchClientsAction(query)
      setResults(found)
      setSearched(true)
      setSelected(null)
    })
  }

  return (
    <section className={s.section}>
      <h2 className={s.heading}>{m.title}</h2>
      <p className={s.subtitle}>{m.subtitle}</p>

      <Feedback {...state} />

      <div className={s.searchRow}>
        <label className={s.fieldLabel} htmlFor="client-search">
          <span className={s.labelText}>{m.searchLabel}</span>
          <input
            id="client-search"
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={m.searchPlaceholder}
            className={s.fieldInput}
          />
        </label>
        <button
          type="button"
          onClick={handleSearch}
          disabled={searching || query.trim().length === 0}
          className={s.searchButton}
        >
          {searching ? m.searching : m.searchLabel}
        </button>
      </div>

      <div aria-live="polite">
        {searched && !searching && results.length === 0 && (
          <p className={s.statusText}>{m.noResults}</p>
        )}
      </div>

      {results.length > 0 && (
        <ul className={s.resultsList}>
          {results.map((client) => (
            <li key={client.id}>
              <button
                type="button"
                aria-pressed={selected?.id === client.id}
                onClick={() => setSelected(client)}
                className={selected?.id === client.id ? s.resultSelected : s.result}
              >
                {client.fullName} — {client.phone}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <form action={formAction} className={s.form}>
          <input type="hidden" name="clientId" value={selected.id} />
          <p className={s.selectedLine}>
            {m.selected}: <strong>{selected.fullName}</strong>
          </p>

          <label className={s.fieldLabel} htmlFor="reason">
            <span className={s.labelText}>{m.reasonLabel}</span>
            <textarea id="reason" name="reason" required rows={2} className={s.textarea} />
          </label>

          <button type="submit" disabled={pending} className={s.submitButton}>
            {m.submit}
          </button>
        </form>
      )}
    </section>
  )
}
