import type { ReactNode } from 'react'
import { requireAdminSession, signOutAction } from '@/features/auth'
import { catalogMessages } from '@/features/catalog/ui/messages'

const m = catalogMessages.shell

// Compuerta de staff para toda la ruta /admin/catalog. requireAdminSession redirige a /admin
// si no hay sesión admin/superadmin; RLS conserva la autorización real (SEC-001).
export default async function AdminCatalogLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await requireAdminSession()

  return (
    <>
      <nav className="navbar border-b border-base-300 bg-base-100 px-6">
        <span className="flex-1 font-serif text-lg">{m.brand}</span>
        <div className="flex flex-none items-center gap-3">
          <span className="hidden text-sm text-base-content/70 sm:inline">
            {session.user.email}
          </span>
          <form action={signOutAction}>
            <button type="submit" className="btn btn-ghost btn-sm">
              {m.signOut}
            </button>
          </form>
        </div>
      </nav>
      {children}
    </>
  )
}
