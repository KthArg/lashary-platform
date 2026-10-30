import { clientAppointmentsPath, clientRecordPath } from '@/features/clients'
import { DailyAgendaPage, type ClientLinks } from '@/features/scheduling'

export const metadata = {
  title: 'Agenda del día | LASHARY Beauty Studio',
}

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
