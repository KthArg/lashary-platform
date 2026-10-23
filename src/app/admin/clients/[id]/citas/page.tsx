import { notFound } from 'next/navigation'
import { requireAdminSession } from '@/features/auth'
import { AppointmentHistory, HISTORY_LABELS, LoadError, readAppointmentHistory } from '@/features/clients'
import type { AdminAppointmentsPageProps } from './citas.types'

export const metadata = {
  title: 'Historial de citas | LASHARY Beauty Studio',
  description: 'Historial de citas de la clienta',
}

export default async function AdminAppointmentsPage({ params }: AdminAppointmentsPageProps) {
  await requireAdminSession()
  const { id } = await params
  const result = await readAppointmentHistory(id)
  if (!result.ok && result.notFound) notFound()
  if (!result.ok) return <LoadError message={result.error} retryLabel={HISTORY_LABELS.retry} />
  return <AppointmentHistory entries={result.entries} />
}
