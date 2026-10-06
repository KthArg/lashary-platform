import type { ReactNode } from 'react'
import { requireAdminSession, signOutAction } from '@/features/auth'
import { mensajesAdminProductos } from '@/features/store/constants/mensajes-admin-productos'
import { storeAdminStyles as STYLES } from './store-admin.styles'

const textosEncabezado = mensajesAdminProductos.shell

export default async function AdminStoreLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const session = await requireAdminSession()

  return (
    <>
      <nav className={STYLES.nav}>
        <span className={STYLES.navBrand}>{textosEncabezado.brand}</span>
        <div className={STYLES.navActions}>
          <span className={STYLES.navEmail}>{session.user.email}</span>
          <form action={signOutAction}>
            <button type="submit" className={STYLES.signOutButton}>
              {textosEncabezado.signOut}
            </button>
          </form>
        </div>
      </nav>
      {children}
    </>
  )
}
