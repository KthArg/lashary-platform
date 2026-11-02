import { getAuthSession, GoogleSignInButton, PhoneRegistrationModal, signOutAction, AUTH_BUTTON_TEXTS, AUTH_LABELS } from '@/features/auth'
import { redirect } from 'next/navigation'
import { loginStyles as STYLES } from './login.styles'
import type { LoginPageProps } from './login.types'

export default async function LoginPage(_props: LoginPageProps) {
  const session = await getAuthSession()
  const needsPhone = Boolean(session?.user && !session.profile?.phone)

  if (session?.user && !needsPhone) {
    redirect('/portal/citas')
  }

  return (
    <main className={STYLES.main}>
      <div className={STYLES.card}>
        <div className={STYLES.header}>
          <h1 className={STYLES.brand}>LASHARY</h1>
          <p className={STYLES.tagline}>BEAUTY STUDIO</p>
        </div>
        {session?.user ? (
          <div className={STYLES.content}>
            <h2 className={STYLES.title}>{AUTH_LABELS.welcomeBack}</h2>
            <div className={STYLES.sessionBox}>
              <p className={STYLES.accountLabel}>{AUTH_LABELS.account}</p>
              <p className={STYLES.accountEmail}>{session.user.email}</p>
              {session.profile?.phone ? <p className={STYLES.phoneText}>{AUTH_LABELS.phonePrefix}{session.profile.phone}</p> : <span className={STYLES.pendingBadge}>{AUTH_LABELS.phonePending}</span>}
            </div>
            <form action={signOutAction}>
              <button type="submit" className={STYLES.signOutBtn}>{AUTH_BUTTON_TEXTS.signOut}</button>
            </form>
          </div>
        ) : (
          <div className={STYLES.content}>
            <div className="space-y-1">
              <h2 className={STYLES.title}>{AUTH_LABELS.welcomeTitle}</h2>
              <p className={STYLES.subtitle}>{AUTH_LABELS.welcomeSubtitle}</p>
            </div>
            <div className={STYLES.buttonContainer}><GoogleSignInButton /></div>
            <p className={STYLES.noticeText}>{AUTH_LABELS.phoneNotice}</p>
            <div className={STYLES.footer}>
              <a href="#ayuda" className={STYLES.helpLink}>{AUTH_LABELS.helpQuestion}</a>
            </div>
          </div>
        )}
      </div>
      {needsPhone && <PhoneRegistrationModal isOpen={true} />}
    </main>
  )
}
