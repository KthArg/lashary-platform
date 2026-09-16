import { ClientsList } from '@/features/clients'
import { adminClientsStyles as STYLES } from './clients.styles'

/** UI-003: estado de carga mientras la pagina lee las clientas en el servidor. */
export default function AdminClientsLoading() {
  return (
    <main className={STYLES.main}>
      <div className={STYLES.container}>
        <ClientsList clients={[]} isLoading />
      </div>
    </main>
  )
}
