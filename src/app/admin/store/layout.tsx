import type { ReactNode } from 'react'
import { requireAdminSession, signOutAction } from '@/features/auth'
import { mensajesAdminProductos } from '@/features/store/constants/mensajes-admin-productos'
import { storeAdminStyles as s } from './store-admin.styles'

const m = mensajesAdminProductos.shell

export default async function AdminStoreLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await requireAdminSession()

  return (
    <>
      <nav className={s.nav}>
        <span className={s.navBrand}>{m.brand}</span>
        <div className={s.navActions}>
          <span className={s.navEmail}>{session.user.email}</span>
          <form action={signOutAction}>
            <button type="submit" className={s.signOutButton}>
              {m.signOut}
            </button>
          </form>
        </div>
      </nav>
      {children}
    </>
  )
}
