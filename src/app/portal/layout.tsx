import { getAuthSession, ClientSidebar, InactivityTimeout } from '@/features/auth'
import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

export interface PortalLayoutProps {
  children: ReactNode
}

export default async function PortalLayout({ children }: PortalLayoutProps) {
  const session = await getAuthSession()

  if (!session?.user) {
    redirect('/login')
  }

  return (
    <div className="flex h-screen overflow-hidden bg-brand-cream">
      <InactivityTimeout />
      <ClientSidebar session={session} />
      <main className="flex-1 overflow-y-auto bg-brand-cream/40 p-6 md:p-8">
        {children}
      </main>
    </div>
  )
}
