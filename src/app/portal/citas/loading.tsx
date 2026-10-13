import { schedulingMessages } from '@/features/scheduling/client'
import { citasStyles as s } from './citas.styles'

export default function Loading() {
  return (
    <div role="status" aria-live="polite" className={s.loadingBox}>
      {schedulingMessages.page.loading}
    </div>
  )
}
