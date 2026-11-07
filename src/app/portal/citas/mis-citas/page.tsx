import { AUTH_LABELS } from '@/features/auth'
import { MyAppointmentsPage, myAppointmentsMessages } from '@/features/scheduling'
import { ClientNotices, loadMyClientNotices } from '@/features/notifications'

export const metadata = {
  title: `${myAppointmentsMessages.title} | ${AUTH_LABELS.clientPortalTitle} LASHARY`,
}

export default async function MyAppointmentsRoute() {
  return <MyAppointmentsPage notices={<ClientNotices result={await loadMyClientNotices()} />} />
}
