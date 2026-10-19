import { RECORD_LABELS } from '@/features/clients'
import { adminRecordStyles as STYLES } from './expediente.styles'

export default function AdminRecordLoading() {
  return (
    <div className={STYLES.page}>
      <h1 className={STYLES.title}>{RECORD_LABELS.pageTitle}</h1>
      <p role="status" className={STYLES.status}>{RECORD_LABELS.loading}</p>
    </div>
  )
}
