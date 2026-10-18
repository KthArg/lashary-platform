import { clientCalendarMessages } from '../constants/client-calendar-strings'
import { clientCalendarStyles as s } from '../styles/client-calendar.styles'

// Carga del calendario (UI-003): la usa loading.tsx al entrar a la ruta y el Suspense de la
// página al cambiar de día o de servicio.
export function ClientCalendarLoading() {
  return (
    <div role="status" aria-live="polite" className={s.loading}>
      {clientCalendarMessages.loading}
    </div>
  )
}
