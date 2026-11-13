import { AUTH_LABELS } from '@/features/auth'
import { MyAppointmentsPage, myAppointmentsMessages } from '@/features/scheduling'
import { ClientNotices, MyAftercare, loadMyAftercare, loadMyClientNotices } from '@/features/notifications'

export const metadata = {
  title: `${myAppointmentsMessages.title} | ${AUTH_LABELS.clientPortalTitle} LASHARY`,
}

export default async function MyAppointmentsRoute() {
  const [noticesResult, aftercareResult] = await Promise.all([loadMyClientNotices(), loadMyAftercare()])
  return (
    <MyAppointmentsPage
      notices={
        <>
          <ClientNotices result={noticesResult} />
          <MyAftercare result={aftercareResult} />
        </>
      }
    />
  )
}
