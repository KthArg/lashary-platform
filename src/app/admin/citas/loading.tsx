// Los archivos de ruta client (loading/error) toman el texto del entry point cliente-seguro
// (ARCH-003): el barrel principal arrastra el acceso a datos de servidor al bundle cliente.
import { schedulingMessages } from '@/features/scheduling/client'
import { adminCitasStyles as STYLES } from './citas.styles'

const m = schedulingMessages.availability

export default function Loading() {
  return (
    <main className={STYLES.main}>
      <h1 className={STYLES.title}>{m.title}</h1>
      <div role="status" aria-live="polite" className={STYLES.loadingBox}>
        <span className={STYLES.spinner} aria-hidden="true" />
        <span>{m.loading}</span>
      </div>
    </main>
  )
}
