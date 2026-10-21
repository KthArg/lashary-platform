import { AUTH_LABELS } from '@/features/auth'
import { myAppointmentsMessages } from '@/features/scheduling'

export { MyAppointmentsPage as default } from '@/features/scheduling'

export const metadata = {
  title: `${myAppointmentsMessages.title} | ${AUTH_LABELS.clientPortalTitle} LASHARY`,
}
