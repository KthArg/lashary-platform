import { AUTH_LABELS } from '@/features/auth'
import { BookingConfirmPage, bookingConfirmMessages } from '@/features/scheduling'

export const metadata = {
  title: `${bookingConfirmMessages.title} | ${AUTH_LABELS.clientPortalTitle} LASHARY`,
}

export default async function ConfirmarPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return <BookingConfirmPage searchParams={await searchParams} />
}
