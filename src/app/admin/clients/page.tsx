import { requireAdminSession } from '@/features/auth'
import { AddClientDialog, ClientsList, CLIENTS_LABELS, listClientsAction } from '@/features/clients'
import { adminClientsStyles as STYLES } from './clients.styles'
import type { AdminClientsPageProps } from './clients.types'

export const metadata = {
  title: 'Clientas | LASHARY Beauty Studio',
  description: 'Registro de clientas del estudio',
}

export default async function AdminClientsPage(_props: AdminClientsPageProps) {
  await requireAdminSession()
  const result = await listClientsAction()

  return (
    <div className={STYLES.page}>
      <header className={STYLES.header}>
        <div>
          <h1 className={STYLES.title}>{CLIENTS_LABELS.sectionTitle}</h1>
          <p className={STYLES.subtitle}>{CLIENTS_LABELS.sectionSubtitle}</p>
        </div>
        <AddClientDialog />
      </header>
      <ClientsList clients={result.ok ? result.clients : []} loadError={result.ok ? null : result.error} />
    </div>
  )
}
