import { getAuthSession, AUTH_LABELS } from '@/features/auth'

export const metadata = {
  title: `${AUTH_LABELS.clientAccountTitle} | ${AUTH_LABELS.clientPortalTitle} LASHARY`,
}

export default async function ClientCuentaPage() {
  const session = await getAuthSession()

  return (
    <div className="space-y-4">
      <div className="border-b border-brand-border pb-4">
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-brand-dark">
          {AUTH_LABELS.clientAccountTitle}
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          {AUTH_LABELS.clientAccountSubtitle}
        </p>
      </div>
      <div className="rounded-xl border border-brand-border bg-brand-surface p-6 shadow-sm space-y-2">
        <p className="text-sm font-semibold text-brand-dark">
          {AUTH_LABELS.emailLabel}{' '}
          <span className="font-normal text-brand-muted">{session?.user.email}</span>
        </p>
        {session?.profile?.phone && (
          <p className="text-sm font-semibold text-brand-dark">
            {AUTH_LABELS.phoneLabel}{' '}
            <span className="font-normal text-brand-muted">{session.profile.phone}</span>
          </p>
        )}
      </div>
    </div>
  )
}
