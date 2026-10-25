import { HISTORY_LABELS } from '@/features/clients'
import { adminAppointmentsStyles as STYLES } from './citas.styles'

export default function AdminAppointmentsLoading() {
  return <p role="status" className={STYLES.status}>{HISTORY_LABELS.loading}</p>
}
