// La UI vive en la feature (ARCH-003); esta ruta solo la compone.
import { AdminAvailabilityPage } from '@/features/scheduling'

export const metadata = {
  title: 'Disponibilidad de la agenda | LASHARY Beauty Studio',
}

export default async function AdminAvailabilityRoute({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  return <AdminAvailabilityPage searchParams={await searchParams} />
}
