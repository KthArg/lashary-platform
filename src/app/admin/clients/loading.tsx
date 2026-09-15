import { ClientsList } from '@/features/clients'
import { adminClientsStyles as s } from './clients.styles'

/** UI-003: estado de carga mientras la pagina lee las clientas en el servidor. */
export default function AdminClientsLoading() {
  return (
    <main className={s.main}>
      <div className={s.container}>
        <ClientsList clients={[]} isLoading />
      </div>
    </main>
  )
}
