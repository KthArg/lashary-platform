import { AUTH_LABELS } from '@/features/auth'
import { ClientCalendarPage, clientCalendarMessages } from '@/features/scheduling'

export const metadata = {
  title: `${clientCalendarMessages.title} | ${AUTH_LABELS.clientPortalTitle} LASHARY`,
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return <ClientCalendarPage searchParams={await searchParams} />
}
