import { getAuthSession, AdminLoginForm, AUTH_ROLES, AUTH_LABELS } from '@/features/auth'
import { redirect } from 'next/navigation'
import { adminStyles as s } from './admin.styles'
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
    <main className={s.main}>
      <div className={s.card}>
        <div className={s.header}>
          <h1 className={s.brand}>LASHARY</h1>
          <p className={s.tagline}>PORTAL ADMINISTRATIVO</p>
        </div>

        <div className={s.content}>
          <div className="space-y-1">
            <h2 className={s.title}>{AUTH_LABELS.adminAccessTitle}</h2>
            <p className={s.subtitle}>{AUTH_LABELS.adminAccessSubtitle}</p>
          </div>
          <AdminLoginForm />
          <div className={s.footer}>
            <p className={s.noticeText}>{AUTH_LABELS.adminRestrictedNotice}</p>
          </div>
        </div>
      </div>
    </main>
  )
}
