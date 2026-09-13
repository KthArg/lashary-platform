import { requireAdminSession } from '@/features/auth'
import { CLIENTS_LABELS } from '@/features/clients'
import { adminClientsStyles as s } from './clients.styles'
import type { AdminClientsPageProps } from './clients.types'

export const metadata = {
  title: 'Clientas | LASHARY Beauty Studio',
  description: 'Registro de clientas del estudio',
}

export default async function AdminClientsPage(_props: AdminClientsPageProps) {
  await requireAdminSession()

  return (
    <main className={s.main}>
      <div className={s.container}>
        <header className={s.header}>
          <h1 className={s.title}>{CLIENTS_LABELS.sectionTitle}</h1>
          <p className={s.subtitle}>{CLIENTS_LABELS.sectionSubtitle}</p>
        </header>
      </div>
    </main>
  )
}
