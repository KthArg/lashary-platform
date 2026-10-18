import { schedulingMessages } from '@/features/scheduling/client'
import { citasStyles as STYLES } from './citas.styles'

export default function Loading() {
  return (
    <div role="status" aria-live="polite" className={STYLES.loadingBox}>
      {schedulingMessages.page.loading}
    </div>
  )
}
