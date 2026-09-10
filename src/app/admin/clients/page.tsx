import { requireAdminSession } from '@/features/auth'
import { AddClientDialog, ClientsList, CLIENTS_LABELS, listClients } from '@/features/clients'
import { adminClientsStyles as s } from './clients.styles'
import type { AdminClientsPageProps } from './clients.types'

export const metadata = {
  title: 'Clientas | LASHARY Beauty Studio',
  description: 'Registro de clientas del estudio',
}

export default async function AdminClientsPage(_props: AdminClientsPageProps) {
  await requireAdminSession()

  // La lectura va despues del guard de rol a proposito: el guard es el mensaje amable y la politica
  // clients_profiles_select_admin es la frontera real (SEC-001).
  const result = await listClients()

  return (
    <main className={s.main}>
      <div className={s.container}>
        <header className={s.header}>
          <div>
            <h1 className={s.title}>{CLIENTS_LABELS.sectionTitle}</h1>
            <p className={s.subtitle}>{CLIENTS_LABELS.sectionSubtitle}</p>
          </div>
          <AddClientDialog />
        </header>

        <ClientsList
          clients={result.ok ? result.clients : []}
          error={result.ok ? null : result.error}
        />
      </div>
    </main>
  )
}
