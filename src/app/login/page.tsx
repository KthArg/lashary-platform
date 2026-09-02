import { getAuthSession, GoogleSignInButton, PhoneRegistrationModal, signOutAction, AUTH_BUTTON_TEXTS, AUTH_LABELS } from '@/features/auth'

export default async function LoginPage() {
  const session = await getAuthSession()
  const needsPhone = session?.user && (!session.profile || !session.profile.phone)

  return (
    <main className="min-h-screen bg-brand-cream flex items-center justify-center p-4 selection:bg-brand-gold selection:text-white">
      <div className="w-full max-w-sm bg-white p-8 sm:p-10 shadow-sm border border-brand-border/40 text-center">
        <div className="mb-8">
          <h1 className="font-serif text-2xl tracking-widest-plus uppercase text-brand-gold font-medium">LASHARY</h1>
          <p className="text-2xs tracking-super-wide text-brand-gold-light uppercase mt-1">BEAUTY STUDIO</p>
        </div>
        {session?.user ? (
          <div className="space-y-6">
            <h2 className="font-serif text-xl text-brand-dark font-normal">{AUTH_LABELS.welcomeBack}</h2>
            <div className="bg-brand-cream/50 p-4 border border-brand-border/60 text-left space-y-1">
              <p className="text-xs text-brand-muted uppercase tracking-wider">{AUTH_LABELS.account}</p>
              <p className="text-sm font-medium text-brand-dark truncate">{session.user.email}</p>
              {session.profile?.phone ? (
                <p className="text-xs text-brand-dark font-medium mt-1">Tel: {session.profile.phone}</p>
              ) : (
                <span className="badge badge-warning badge-sm mt-1">{AUTH_LABELS.phonePending}</span>
              )}
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
              <h2 className="font-serif text-xl text-brand-dark font-normal">{AUTH_LABELS.welcomeTitle}</h2>
              <p className="text-xs text-brand-muted">{AUTH_LABELS.welcomeSubtitle}</p>
            </div>
            <div className="pt-2"><GoogleSignInButton /></div>
            <p className="text-3xs text-brand-muted/80 leading-relaxed px-2">{AUTH_LABELS.phoneNotice}</p>
            <div className="pt-4 border-t border-brand-border/60">
              <a href="#ayuda" className="text-xs text-brand-muted hover:text-brand-dark transition-colors">{AUTH_LABELS.helpQuestion}</a>
            </div>
          </div>
        )}
      </div>
      {needsPhone && <PhoneRegistrationModal isOpen={true} />}
    </main>
  )
}
