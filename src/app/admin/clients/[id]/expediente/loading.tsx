import { RECORD_LABELS } from '@/features/clients'
import { adminRecordStyles as STYLES } from './expediente.styles'

export default function AdminRecordLoading() {
  return <p role="status" className={STYLES.status}>{RECORD_LABELS.loading}</p>
}
