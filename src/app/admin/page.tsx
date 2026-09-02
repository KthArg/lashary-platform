import { getAuthSession, AdminLoginForm, signOutAction, AUTH_BUTTON_TEXTS, AUTH_LABELS } from '@/features/auth'

export const metadata = {
  title: 'Acceso Administrativo | LASHARY Beauty Studio',
  description: 'Portal de autenticación exclusivo para administradores',
}

export default async function AdminLoginPage() {
  const session = await getAuthSession()
  const isAdmin = session?.user && (session.role === 'admin' || session.role === 'superadmin')

  return (
    <main className="min-h-screen bg-brand-cream flex items-center justify-center p-4 selection:bg-brand-gold selection:text-white">
      <div className="w-full max-w-sm bg-white p-8 sm:p-10 shadow-sm border border-brand-border/40 text-center">
        <div className="mb-8">
          <h1 className="font-serif text-2xl tracking-widest-plus uppercase text-brand-gold font-medium">LASHARY</h1>
          <p className="text-2xs tracking-super-wide text-brand-gold-light uppercase mt-1">PORTAL ADMINISTRATIVO</p>
        </div>

        {isAdmin ? (
          <div className="space-y-6">
            <h2 className="font-serif text-xl text-brand-dark font-normal">{AUTH_LABELS.adminActiveSession}</h2>
            <div className="bg-brand-cream/50 p-4 border border-brand-border/60 text-left space-y-1">
              <p className="text-xs text-brand-muted uppercase tracking-wider">{AUTH_LABELS.account}</p>
              <p className="text-sm font-medium text-brand-dark truncate">{session.user.email}</p>
              <div className="pt-1">
                <span className="inline-block bg-brand-dark text-white text-3xs uppercase tracking-wider px-2 py-0.5 font-medium">
                  {AUTH_LABELS.adminRoleBadge} {session.role}
                </span>
              </div>
            </div>
            <form action={signOutAction}>
              <button type="submit" className="w-full bg-brand-dark hover:bg-black text-white text-xs tracking-widest uppercase py-3.5 px-4 transition-colors font-medium rounded-none">
                {AUTH_BUTTON_TEXTS.signOut}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="font-serif text-xl text-brand-dark font-normal">{AUTH_LABELS.adminAccessTitle}</h2>
              <p className="text-xs text-brand-muted">{AUTH_LABELS.adminAccessSubtitle}</p>
            </div>
            <AdminLoginForm />
            <div className="pt-4 border-t border-brand-border/60 text-center">
              <p className="text-3xs text-brand-muted tracking-wide">{AUTH_LABELS.adminRestrictedNotice}</p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
