import { requireAdminSession } from '@/features/auth'
import {
  AddClientDialog,
  ClientsList,
  ClientsNameFilter,
  ClientsPagination,
  ClientsAppointmentFilter,
  ClientsDelinquencyFilter,
  CLIENTS_LABELS,
  listClientsAction,
  readClientsListParams,
} from '@/features/clients'
import { adminClientsStyles as STYLES } from './clients.styles'
import type { AdminClientsPageProps } from './clients.types'

export const metadata = {
  title: 'Clientas | LASHARY Beauty Studio',
  description: 'Registro de clientas del estudio',
}

export default async function AdminClientsPage({ searchParams }: AdminClientsPageProps) {
  await requireAdminSession()
  const { page, pageSize, name, appointmentFrom, appointmentTo, delinquency: delinquencyFilter } =
    readClientsListParams((await searchParams) ?? {})
  const result = await listClientsAction({
    page,
    pageSize,
    name: name || undefined,
    appointmentFrom: appointmentFrom || undefined,
    appointmentTo: appointmentTo || undefined,
    delinquency: delinquencyFilter || undefined,
  })
  const isInvalidRange = !result.ok && result.reason === 'invalid-appointment-range'

  return (
    <div className={STYLES.page}>
      <header className={STYLES.header}>
        <div>
          <h1 className={STYLES.title}>{CLIENTS_LABELS.sectionTitle}</h1>
          <p className={STYLES.subtitle}>{CLIENTS_LABELS.sectionSubtitle}</p>
        </div>
        <AddClientDialog />
      </header>
      <ClientsNameFilter name={name} />
      <ClientsAppointmentFilter appointmentFrom={appointmentFrom} appointmentTo={appointmentTo} />
      <ClientsDelinquencyFilter delinquency={delinquencyFilter} />
      <ClientsList
        clients={result.ok ? result.clients : []}
        delinquency={result.ok ? result.delinquency : {}}
        delinquencyAvailable={result.ok ? result.delinquencyAvailable : false}
        loadError={!result.ok && !isInvalidRange ? result.error : null}
        filterError={isInvalidRange ? result.error : null}
        activeNameFilter={name || null}
        hasAppointmentRangeFilter={Boolean(appointmentFrom || appointmentTo)}
        hasDelinquencyFilter={Boolean(delinquencyFilter)}
      />
      {result.ok && result.total > 0 ? (
        <ClientsPagination page={result.page} pageSize={result.pageSize} total={result.total} />
      ) : null}
    </div>
  )
}
