import { checkoutMessages } from '@/features/store/client'
import { finalizarStyles as STYLES } from './finalizar.styles'

export default function Loading() {
  return (
    <div role="status" aria-live="polite" className={STYLES.loadingBox}>
      {checkoutMessages.loading}
    </div>
  )
}
