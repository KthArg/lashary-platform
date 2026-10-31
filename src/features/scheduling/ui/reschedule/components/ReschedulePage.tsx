import { Suspense } from 'react'
import { ClientCalendarLoading } from '../../client-calendar/components/ClientCalendarLoading'
import { reschedulePageService } from '../services/reschedule-page-service'
import type { RescheduleSearchParams } from '../types/reschedule-page.types'
import { rescheduleRequestKey } from '../utils/reschedule-request-key'
import { RescheduleView } from './RescheduleView'

type ReschedulePageProps = {
  appointmentId: string
  searchParams: RescheduleSearchParams
}

async function RescheduleContent({ appointmentId, searchParams }: ReschedulePageProps) {
  return <RescheduleView view={await reschedulePageService.load(appointmentId, searchParams)} />
}

export function ReschedulePage({ appointmentId, searchParams }: ReschedulePageProps) {
  return (
    <Suspense key={rescheduleRequestKey(appointmentId, searchParams)} fallback={<ClientCalendarLoading />}>
      <RescheduleContent appointmentId={appointmentId} searchParams={searchParams} />
    </Suspense>
  )
}
