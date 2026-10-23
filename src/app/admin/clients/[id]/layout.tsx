import Link from 'next/link'
import { notFound } from 'next/navigation'
import { requireAdminSession } from '@/features/auth'
import { CLIENT_PROFILE_LABELS, CLIENTS_PATH, clientAppointmentsPath, clientRecordPath, getClientAction } from '@/features/clients'
import { ClientProfileTabs } from './client-profile-tabs'
import { clientProfileStyles as STYLES } from './client-profile.styles'
import type { ClientProfileLayoutProps } from './client-profile.types'

export default async function ClientProfileLayout({ children, params }: ClientProfileLayoutProps) {
  await requireAdminSession()
  const { id } = await params
  const result = await getClientAction(id)
  if (!result.ok && result.reason === 'not-found') notFound()

  return (
    <div className={STYLES.page}>
      <header className={STYLES.header}>
        <Link href={CLIENTS_PATH} className={STYLES.back}>{CLIENT_PROFILE_LABELS.backToClients}</Link>
        {result.ok ? (
          <>
            <h1 className={STYLES.title}>{result.client.fullName}</h1>
            <p className={STYLES.subtitle}>{result.client.phone}</p>
          </>
        ) : (
          <p role="alert" className={STYLES.error}>{result.error}</p>
        )}
      </header>
      <ClientProfileTabs
        label={CLIENT_PROFILE_LABELS.tabsLabel}
        tabs={[
          { label: CLIENT_PROFILE_LABELS.recordTab, href: clientRecordPath(id) },
          { label: CLIENT_PROFILE_LABELS.appointmentsTab, href: clientAppointmentsPath(id) },
        ]}
      />
      {children}
    </div>
  )
}
