import { AUTH_LABELS } from '@/features/auth'
import { ReschedulePage, reschedulePageMessages } from '@/features/scheduling'

export const metadata = {
  title: `${reschedulePageMessages.title} | ${AUTH_LABELS.clientPortalTitle} LASHARY`,
}

export default async function ReagendarPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { id } = await params
  return <ReschedulePage appointmentId={id} searchParams={await searchParams} />
}
