import { requireAdminSession } from '@/features/auth'
import { AdminSchedulingPage } from '@/features/scheduling'

export const metadata = {
  title: 'Citas | Panel Administrativo LASHARY',
}

export default async function AdminCitasPage() {
  await requireAdminSession()

  return <AdminSchedulingPage />
}
