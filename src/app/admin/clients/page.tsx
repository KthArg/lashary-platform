import { requireAdminSession } from '@/features/auth'
import { AddClientDialog, ClientsList, ClientsPagination, CLIENTS_LABELS, listClientsAction } from '@/features/clients'
import { adminClientsStyles as STYLES } from './clients.styles'
import type { AdminClientsPageProps } from './clients.types'

export const metadata = {
  title: 'Clientas | LASHARY Beauty Studio',
  description: 'Registro de clientas del estudio',
}

const readNumber = (value: string | undefined): number | undefined => {
  const parsed = Number(value)
  return value !== undefined && Number.isFinite(parsed) ? parsed : undefined
}

export default async function AdminClientsPage({ searchParams }: AdminClientsPageProps) {
  await requireAdminSession()
  const params = (await searchParams) ?? {}
  const result = await listClientsAction({
    page: readNumber(params.page),
    pageSize: readNumber(params.pageSize),
  })

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
      {result.ok && result.total > 0 ? (
        <ClientsPagination page={result.page} pageSize={result.pageSize} total={result.total} />
      ) : null}
    </div>
  )
}
