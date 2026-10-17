import type { ReactNode } from 'react'
import { requireAdminSession } from '@/features/auth'
import { CitasTabs } from './citas-tabs'

// Compuerta de staff para toda la ruta /admin/citas: la cola de aprobación (US-AGE-09) y la
// disponibilidad (US-AGE-01). RLS conserva la autorización real (SEC-001).
export default async function AdminCitasLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireAdminSession()

  return (
    <>
      <CitasTabs />
      {children}
    </>
  )
}
