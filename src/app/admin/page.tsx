import { getAuthSession, AdminLoginForm, AUTH_ROLES, AUTH_LABELS, CLIENT_LOGIN_ROUTE } from '@/features/auth'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { adminStyles as STYLES } from './admin.styles'
import type { AdminLoginPageProps } from './admin.types'

export const metadata = {
  title: 'Acceso Administrativo | LASHARY Beauty Studio',
  description: 'Portal de autenticación exclusivo para administradores',
}

export default async function AdminLoginPage(_props: AdminLoginPageProps) {
  const session = await getAuthSession()
  const isAdmin = Boolean(session?.user && (session.role === AUTH_ROLES.ADMIN || session.role === AUTH_ROLES.SUPERADMIN))

  if (isAdmin) {
    redirect('/admin/dashboard')
  }

  return (
    <main className={STYLES.main}>
      <div className={STYLES.card}>
        <div className={STYLES.header}>
          <h1 className={STYLES.brand}>LASHARY</h1>
          <p className={STYLES.tagline}>PORTAL ADMINISTRATIVO</p>
        </div>

        <div className={STYLES.content}>
          <div className="space-y-1">
            <h2 className={STYLES.title}>{AUTH_LABELS.adminAccessTitle}</h2>
            <p className={STYLES.subtitle}>{AUTH_LABELS.adminAccessSubtitle}</p>
          </div>
          <AdminLoginForm />
          <div className={STYLES.footer}>
            <p className={STYLES.noticeText}>{AUTH_LABELS.adminRestrictedNotice}</p>
            <Link href={CLIENT_LOGIN_ROUTE} className={STYLES.clientAccessLink}>{AUTH_LABELS.clientAccessLink}</Link>
          </div>
        </div>
      </div>
    </main>
  )
}
