'use client'

import { useCallback, useRef, useState } from 'react'
import { CLIENTS_ARIA_LABELS, CLIENTS_BUTTON_TEXTS, CLIENTS_LABELS } from '../../constants/clients-strings'
import { EditClientDialog } from '../EditClientDialog'
import { clientsListStyles as s } from './ClientsList.styles'
import type { ClientRecord } from '../../types/client.types'
import type { ClientsListProps } from './ClientsList.types'

/**
 * US-CLI-05 criterio 2 — lista minima de clientas: nombre y su accion de editar, nada mas.
 * El listado con filtros, busqueda y paginacion es US-CLI-01 y no pertenece a esta historia.
 * Los tres estados de UI-003: vacio y error viven aqui; el de carga es loading.tsx de la ruta,
 * porque quien espera por la base es el Server Component que renderiza esta lista, no la lista.
 *
 * Hay UN solo dialogo para toda la lista, no uno por fila: montar cuatro modales ocultos
 * multiplica los focus traps y los listeners de Escape sin que ninguno haga falta.
 */
export function ClientsList({ clients, error = null }: ClientsListProps) {
  const [editing, setEditing] = useState<ClientRecord | null>(null)
  // Con cuatro lapices, "el disparador" no es uno fijo: hay que recordar cual se pulso (UI-004).
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const openEditor = useCallback((client: ClientRecord, trigger: HTMLButtonElement) => {
    triggerRef.current = trigger
    setEditing(client)
  }, [])

  const closeEditor = useCallback(() => {
    setEditing(null)
    triggerRef.current?.focus()
  }, [])

  return (
    <section className={s.section}>
      <h2 className={s.title}>{CLIENTS_LABELS.clientsListTitle}</h2>

      {error ? (
        /* role=alert: el fallo llega despues del render y hay que anunciarlo, no dejarlo mudo (UI-004). */
        <p className={s.error} role="alert">{error}</p>
      ) : clients.length === 0 ? (
        <p className={s.empty}>{CLIENTS_LABELS.clientsListEmpty}</p>
      ) : (
        <ul className={s.list}>
          {clients.map((client) => (
            <li key={client.id} className={s.row}>
              <span className={s.name}>{client.fullName}</span>
              {/*
                Boton de solo icono: sin texto visible, el aria-label es el UNICO nombre del boton
                y por eso nombra a la clienta (UI-004). El title es la ayuda para quien usa raton.
                SVG inline como en GoogleSignInButton: el proyecto no tiene libreria de iconos y no
                se trae una por un lapiz.
              */}
              <button
                type="button"
                className={s.editButton}
                title={CLIENTS_BUTTON_TEXTS.edit}
                aria-label={CLIENTS_ARIA_LABELS.editClient(client.fullName)}
                onClick={(event) => openEditor(client, event.currentTarget)}
              >
                <svg className={s.editIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                  <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}

      <EditClientDialog client={editing} onClose={closeEditor} />
    </section>
  )
}
