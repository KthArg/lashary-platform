import { Suspense } from 'react'
import { clientCalendarService } from '../services/client-calendar-service'
import { calendarRequestKey } from '../utils/calendar-params'
import type { CalendarSearchParams } from '../types/client-calendar.types'
import { ClientCalendarLoading } from './ClientCalendarLoading'
import { ClientCalendarView } from './ClientCalendarView'

async function ClientCalendarContent({ searchParams }: { searchParams: CalendarSearchParams }) {
  return <ClientCalendarView view={await clientCalendarService.load(searchParams)} />
}

// Compone /portal/citas/calendario. La key del Suspense cambia con el servicio y el día, así la
// carga se ve también al navegar, no solo al entrar (UI-003). Un error de lectura sube a error.tsx.
export function ClientCalendarPage({ searchParams }: { searchParams: CalendarSearchParams }) {
  return (
    <Suspense key={calendarRequestKey(searchParams)} fallback={<ClientCalendarLoading />}>
      <ClientCalendarContent searchParams={searchParams} />
    </Suspense>
  )
}
