import { requireAdminSession } from '@/features/auth'
import { AddClientDialog, ClientsList, CLIENTS_LABELS, listClientsAction } from '@/features/clients'
import { adminClientsStyles as s } from './clients.styles'
import type { AdminClientsPageProps } from './clients.types'

export const metadata = {
  title: 'Clientas | LASHARY Beauty Studio',
  description: 'Registro de clientas del estudio',
}

export default async function AdminClientsPage(_props: AdminClientsPageProps) {
  await requireAdminSession()
  const result = await listClientsAction()

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
        <ClientsList clients={result.ok ? result.clients : []} loadError={result.ok ? null : result.error} />
      </div>
    </main>
  )
}
