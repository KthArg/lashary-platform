import type { ReactNode } from 'react'
import { requireAdminSession } from '@/features/auth'
import { MorosidadesTabs } from './morosidades-tabs'

export default async function AdminMorosidadesLayout({ children }: Readonly<{ children: ReactNode }>) {
  await requireAdminSession()

  return (
    <>
      <MorosidadesTabs />
      {children}
    </>
  )
}
