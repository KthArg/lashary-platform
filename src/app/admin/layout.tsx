import { getAuthSession, AdminSidebar, InactivityTimeout, AUTH_ROLES } from '@/features/auth'
import { AdminInbox, loadAdminInbox } from '@/features/notifications'
import type { ReactNode } from 'react'

export interface AdminLayoutProps {
  children: ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getAuthSession()
  const isAdmin = Boolean(
    session?.user &&
    (session.role === AUTH_ROLES.ADMIN || session.role === AUTH_ROLES.SUPERADMIN)
  )

  if (!isAdmin || !session) {
    return <>{children}</>
  }

  const inbox = await loadAdminInbox()

  return (
    <div className="flex h-screen overflow-hidden bg-brand-cream">
      <InactivityTimeout />
      <AdminSidebar session={session} notifications={<AdminInbox inbox={inbox} />} />
      <main className="flex-1 overflow-y-auto bg-brand-cream/40 p-6 md:p-8">
        {children}
      </main>
    </div>
  )
}
