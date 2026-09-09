import { getAuthSession, GoogleSignInButton, PhoneRegistrationModal, signOutAction, AUTH_BUTTON_TEXTS, AUTH_LABELS } from '@/features/auth'
import { loginStyles as s } from './login.styles'
import type { LoginPageProps } from './login.types'

export default async function LoginPage(_props: LoginPageProps) {
  const session = await getAuthSession()
  const needsPhone = Boolean(session?.user && !session.profile?.phone)

  return (
    <main className={s.main}>
      <div className={s.card}>
        <div className={s.header}>
          <h1 className={s.brand}>LASHARY</h1>
          <p className={s.tagline}>BEAUTY STUDIO</p>
        </div>
        {session?.user ? (
          <div className={s.content}>
            <h2 className={s.title}>{AUTH_LABELS.welcomeBack}</h2>
            <div className={s.sessionBox}>
              <p className={s.accountLabel}>{AUTH_LABELS.account}</p>
              <p className={s.accountEmail}>{session.user.email}</p>
              {session.profile?.phone ? <p className={s.phoneText}>{AUTH_LABELS.phonePrefix}{session.profile.phone}</p> : <span className={s.pendingBadge}>{AUTH_LABELS.phonePending}</span>}
            </div>
            <form action={signOutAction}>
              <button type="submit" className={s.signOutBtn}>{AUTH_BUTTON_TEXTS.signOut}</button>
            </form>
          </div>
        ) : (
          <div className={s.content}>
            <div className="space-y-1">
              <h2 className={s.title}>{AUTH_LABELS.welcomeTitle}</h2>
              <p className={s.subtitle}>{AUTH_LABELS.welcomeSubtitle}</p>
            </div>
            <div className={s.buttonContainer}><GoogleSignInButton /></div>
            <p className={s.noticeText}>{AUTH_LABELS.phoneNotice}</p>
            <div className={s.footer}>
              <a href="#ayuda" className={s.helpLink}>{AUTH_LABELS.helpQuestion}</a>
            </div>
          </div>
        )}
      </div>
      {needsPhone && <PhoneRegistrationModal isOpen={true} />}
    </main>
  )
}
