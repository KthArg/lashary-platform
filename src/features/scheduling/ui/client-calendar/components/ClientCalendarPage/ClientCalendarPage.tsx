import { Suspense } from 'react'
import { clientCalendarService } from '../../services/client-calendar-service'
import { calendarRequestKey } from '../../utils/calendar-params'
import { ClientCalendarLoading } from '../ClientCalendarLoading'
import { ClientCalendarView } from '../ClientCalendarView'
import type { ClientCalendarPageProps } from './ClientCalendarPage.types'

async function ClientCalendarContent({ searchParams }: ClientCalendarPageProps) {
  return <ClientCalendarView view={await clientCalendarService.load(searchParams)} />
}

export function ClientCalendarPage({ searchParams }: ClientCalendarPageProps) {
  return (
    <Suspense key={calendarRequestKey(searchParams)} fallback={<ClientCalendarLoading />}>
      <ClientCalendarContent searchParams={searchParams} />
    </Suspense>
  )
}
