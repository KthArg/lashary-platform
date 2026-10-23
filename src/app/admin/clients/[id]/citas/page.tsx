import { notFound, redirect } from 'next/navigation'
import { requireAdminSession } from '@/features/auth'
import {
  AppointmentHistory,
  AppointmentHistoryPagination,
  HISTORY_LABELS,
  LoadError,
  appointmentHistoryUrl,
  parseHistoryPage,
  readAppointmentHistory,
} from '@/features/clients'
import type { AdminAppointmentsPageProps } from './citas.types'

export const metadata = {
  title: 'Historial de citas | LASHARY Beauty Studio',
  description: 'Historial de citas de la clienta',
}

export default async function AdminAppointmentsPage({ params, searchParams }: AdminAppointmentsPageProps) {
  await requireAdminSession()
  const { id } = await params
  const page = parseHistoryPage((await searchParams).page)
  const result = await readAppointmentHistory(id, page)
  if (!result.ok && result.notFound) notFound()
  if (!result.ok) return <LoadError message={result.error} retryLabel={HISTORY_LABELS.retry} />
  if (result.entries.length === 0 && result.total > 0) redirect(appointmentHistoryUrl(id, 0))
  return (
    <>
      <AppointmentHistory entries={result.entries} />
      {result.total > 0 && (
        <AppointmentHistoryPagination clientId={id} page={result.page} pageSize={result.pageSize} total={result.total} />
      )}
    </>
  )
}
