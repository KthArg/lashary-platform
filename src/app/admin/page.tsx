import { getAuthSession, AdminLoginForm, signOutAction, AUTH_ROLES, AUTH_BUTTON_TEXTS, AUTH_LABELS } from '@/features/auth'
import { adminStyles as s } from './admin.styles'
import type { AdminLoginPageProps } from './admin.types'

export const metadata = {
  title: 'Acceso Administrativo | LASHARY Beauty Studio',
  description: 'Portal de autenticación exclusivo para administradores',
}

export default async function AdminLoginPage(_props: AdminLoginPageProps) {
  const session = await getAuthSession()
  const isAdmin = Boolean(session?.user && (session.role === AUTH_ROLES.ADMIN || session.role === AUTH_ROLES.SUPERADMIN))

  return (
    <main className={s.main}>
      <div className={s.card}>
        <div className={s.header}>
          <h1 className={s.brand}>LASHARY</h1>
          <p className={s.tagline}>PORTAL ADMINISTRATIVO</p>
        </div>

        {isAdmin ? (
          <div className={s.content}>
            <h2 className={s.title}>{AUTH_LABELS.adminActiveSession}</h2>
            <div className={s.sessionBox}>
              <p className={s.accountLabel}>{AUTH_LABELS.account}</p>
              <p className={s.accountEmail}>{session.user.email}</p>
              <div className={s.badgeContainer}>
                <span className={s.badge}>
                  {AUTH_LABELS.adminRoleBadge} {session.role}
                </span>
              </div>
            </div>
            <form action={signOutAction}>
              <button type="submit" className={s.signOutBtn}>
                {AUTH_BUTTON_TEXTS.signOut}
              </button>
            </form>
          </div>
        ) : (
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
        )}
      </div>
    </main>
  )
}
