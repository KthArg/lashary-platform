import type { ReactNode } from 'react'
import { requireAdminSession } from '@/features/auth'
import { CitasTabs } from './citas-tabs'

export default async function AdminCitasLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireAdminSession()

  return (
    <>
      <CitasTabs />
      {children}
    </>
  )
}
