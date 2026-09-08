import { requireAdminSession } from '@/features/auth'
import { AddClientForm, CLIENTS_LABELS } from '@/features/clients'
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
          <div>
            <h1 className={s.title}>{CLIENTS_LABELS.sectionTitle}</h1>
            <p className={s.subtitle}>{CLIENTS_LABELS.sectionSubtitle}</p>
          </div>
        </header>

        <section className={s.formSection} aria-labelledby="new-client-title">
          <h2 id="new-client-title" className={s.formTitle}>{CLIENTS_LABELS.newClientTitle}</h2>
          <p className={s.formDescription}>{CLIENTS_LABELS.newClientDescription}</p>
          <AddClientForm />
        </section>
      </div>
    </main>
  )
}
