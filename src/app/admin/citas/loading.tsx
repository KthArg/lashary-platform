import { ApprovalQueue } from '@/features/scheduling'
import { adminCitasStyles as STYLES } from './citas.styles'

export default function AdminCitasLoading() {
  return (
    <div className={STYLES.page}>
      <ApprovalQueue appointments={[]} isLoading />
    </div>
  )
}
