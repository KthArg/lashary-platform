import { clientAppointmentsPath, clientRecordPath } from '@/features/clients'
import { DailyAgendaPage, type ClientLinks } from '@/features/scheduling'

export const metadata = {
  title: 'Agenda del día | LASHARY Beauty Studio',
}

// La agenda es de scheduling y el expediente de clients: esta página compone las dos (ARCH-005).
const clientLinks: ClientLinks = (clientId) => ({
  record: clientRecordPath(clientId),
  appointments: clientAppointmentsPath(clientId),
})

export default async function AdminDailyAgendaRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return <DailyAgendaPage searchParams={await searchParams} clientLinks={clientLinks} />
}
