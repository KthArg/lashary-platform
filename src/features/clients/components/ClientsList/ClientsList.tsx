import { CLIENTS_ARIA_LABELS, CLIENTS_BUTTON_TEXTS, CLIENTS_LABELS } from '../../constants/clients-strings'
import { clientsListStyles as s } from './ClientsList.styles'
import type { ClientsListProps } from './ClientsList.types'

/**
 * US-CLI-05 criterio 2 — lista minima de clientas: nombre y su accion de editar, nada mas.
 * El listado con filtros, busqueda y paginacion es US-CLI-01 y no pertenece a esta historia.
 * Sin estado de carga ni de error (UI-003) porque la fuente es un arreglo en memoria: no tarda
 * ni falla. Ambos entran con el server action que lea de la base.
 */
export function ClientsList({ clients }: ClientsListProps) {
  return (
    <section className={s.section}>
      <h2 className={s.title}>{CLIENTS_LABELS.clientsListTitle}</h2>

      {clients.length === 0 ? (
        <p className={s.empty}>{CLIENTS_LABELS.clientsListEmpty}</p>
      ) : (
        <ul className={s.list}>
          {clients.map((client) => (
            <li key={client.id} className={s.row}>
              <span className={s.name}>{client.fullName}</span>
              <button type="button" className={s.editButton} aria-label={CLIENTS_ARIA_LABELS.editClient(client.fullName)}>
                {CLIENTS_BUTTON_TEXTS.edit}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
