'use client'

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CLIENTS_ARIA_LABELS, CLIENTS_BUTTON_TEXTS, CLIENTS_LABELS, CLIENTS_TABLE_HEADERS, CLIENTS_TABLE_TEXTS } from '../../constants/clients-strings'
import { CLIENTS_ICON_PATHS } from '../../constants/clients-icons'
import { EditClientDialog } from '../EditClientDialog'
import { clientsListStyles as STYLES } from './ClientsList.styles'
import type { ClientRecord } from '../../types/client.types'
import type { ClientsListProps } from './ClientsList.types'

export function ClientsList({ clients, isLoading = false, loadError = null, activeNameFilter = null }: ClientsListProps) {
  const router = useRouter()
  const [editing, setEditing] = useState<ClientRecord | null>(null)
  const triggerRef = useRef<HTMLButtonElement | null>(null)

  const closeEditor = useCallback(() => {
    setEditing(null)
    triggerRef.current?.focus()
  }, [])

  const renderBody = () => {
    if (isLoading) return <p role="status" className={STYLES.empty}>{CLIENTS_LABELS.clientsListLoading}</p>
    if (loadError) {
      return (
        <div role="alert" className={STYLES.error}>
          <p>{loadError}</p>
          <button type="button" className={STYLES.retryButton} onClick={() => router.refresh()}>{CLIENTS_BUTTON_TEXTS.retry}</button>
        </div>
      )
    }
    if (clients.length === 0) {
      const emptyMessage = activeNameFilter
        ? CLIENTS_LABELS.clientsListEmptyForFilter(activeNameFilter)
        : CLIENTS_LABELS.clientsListEmpty
      return <p className={STYLES.empty}>{emptyMessage}</p>
    }
    return (
      <div className={STYLES.tableWrapper}>
        <table className={STYLES.table}>
          <thead>
            <tr>
              <th scope="col" className={STYLES.headerCell}>{CLIENTS_TABLE_HEADERS.fullName}</th>
              <th scope="col" className={STYLES.headerCell}>{CLIENTS_TABLE_HEADERS.phone}</th>
              <th scope="col" className={STYLES.headerCell}>{CLIENTS_TABLE_HEADERS.email}</th>
              <th scope="col" className={STYLES.headerCell}>{CLIENTS_TABLE_HEADERS.delinquencyStatus}</th>
              <th scope="col" className={STYLES.headerCell}>{CLIENTS_TABLE_HEADERS.lastAppointment}</th>
              <th scope="col" className={STYLES.headerCellActions}>{CLIENTS_TABLE_HEADERS.actions}</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => (
              <tr key={client.id} className={STYLES.row}>
                <th scope="row" className={STYLES.nameCell}>{client.fullName}</th>
                <td className={STYLES.contactCell}>{client.phone}</td>
                <td className={STYLES.contactCell}>{client.email}</td>
                <td className={STYLES.pendingCell}>{CLIENTS_TABLE_TEXTS.pendingColumnValue}</td>
                <td className={STYLES.pendingCell}>{CLIENTS_TABLE_TEXTS.pendingColumnValue}</td>
                <td className={STYLES.actionsCell}>
                  <button type="button" className={STYLES.editButton} title={CLIENTS_BUTTON_TEXTS.edit}
                    aria-label={CLIENTS_ARIA_LABELS.editClient(client.fullName)}
                    onClick={(event) => { triggerRef.current = event.currentTarget; setEditing(client) }}>
                    <svg className={STYLES.editIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                      <path d={CLIENTS_ICON_PATHS.editPencil} />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <section className={STYLES.section}>
      <h2 className={STYLES.title}>{CLIENTS_LABELS.clientsListTitle}</h2>
      {renderBody()}
      <EditClientDialog client={editing} onClose={closeEditor} />
    </section>
  )
}
