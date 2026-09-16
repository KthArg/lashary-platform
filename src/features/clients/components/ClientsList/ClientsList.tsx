'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CLIENTS_ARIA_LABELS, CLIENTS_BUTTON_TEXTS, CLIENTS_LABELS } from '../../constants/clients-strings'
import { EditClientDialog } from '../EditClientDialog'
import { clientsListStyles as s } from './ClientsList.styles'
import type { ClientRecord } from '../../types/client.types'
import type { ClientsListProps } from './ClientsList.types'

/** US-CLI-05 criterio 2. Un solo dialogo para toda la lista: uno por fila multiplicaria focus traps. */
export function ClientsList({ clients, isLoading = false, loadError = null }: ClientsListProps) {
  const router = useRouter()
  const [editing, setEditing] = useState<ClientRecord | null>(null)
  // Con varios lapices hay que recordar cual se pulso para devolverle el foco (UI-004).
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const closeEditor = useCallback(() => {
    setEditing(null)
    triggerRef.current?.focus()
  }, [])

  // UI-003: carga y error se anuncian al lector (status / alert); el error ofrece volver a leer.
  const renderBody = () => {
    if (isLoading) return <p role="status" className={s.empty}>{CLIENTS_LABELS.clientsListLoading}</p>
    if (loadError) {
      return (
        <div role="alert" className={s.error}>
          <p>{loadError}</p>
          <button type="button" className={s.retryButton} onClick={() => router.refresh()}>{CLIENTS_BUTTON_TEXTS.retry}</button>
        </div>
      )
    }
    if (clients.length === 0) return <p className={s.empty}>{CLIENTS_LABELS.clientsListEmpty}</p>
    return (
      <ul className={s.list}>
        {clients.map((client) => (
          <li key={client.id} className={s.row}>
            <span className={s.name}>{client.fullName}</span>
            {/* Solo icono: el aria-label es el unico nombre del boton, por eso nombra a la clienta (UI-004). */}
            <button type="button" className={s.editButton} title={CLIENTS_BUTTON_TEXTS.edit}
              aria-label={CLIENTS_ARIA_LABELS.editClient(client.fullName)}
              onClick={(event) => { triggerRef.current = event.currentTarget; setEditing(client) }}>
              <svg className={s.editIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <section className={s.section}>
      <h2 className={s.title}>{CLIENTS_LABELS.clientsListTitle}</h2>
      {renderBody()}
      <EditClientDialog client={editing} onClose={closeEditor} />
    </section>
  )
}
