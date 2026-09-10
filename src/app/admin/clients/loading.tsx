import { CLIENTS_LABELS } from '@/features/clients'
import { adminClientsStyles as s } from './clients.styles'

/**
 * Estado de carga de la seccion (UI-003). Vive en la ruta y no en ClientsList: quien espera por la
 * base es este Server Component. aria-busy + role=status para que el lector lo anuncie (UI-004).
 */
export default function AdminClientsLoading() {
  return (
    <main className={s.main}>
      <div className={s.container}>
        <header className={s.header}>
          <div>
            <h1 className={s.title}>{CLIENTS_LABELS.sectionTitle}</h1>
            <p className={s.subtitle}>{CLIENTS_LABELS.sectionSubtitle}</p>
          </div>
        </header>
        <p className={s.subtitle} role="status" aria-busy="true">
          {CLIENTS_LABELS.clientsListLoading}
        </p>
      </div>
    </main>
  )
}
