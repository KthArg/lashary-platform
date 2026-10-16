import { requireAdminSession } from '@/features/auth'
import { ApprovalQueue, APPROVAL_QUEUE_LABELS, listPendingAppointmentsAction } from '@/features/scheduling'
import { adminCitasStyles as STYLES } from './citas.styles'

export const metadata = {
  title: 'Citas | LASHARY Beauty Studio',
  description: 'Cola de aprobación de citas del estudio',
}

export default async function AdminCitasPage() {
  await requireAdminSession()
  const result = await listPendingAppointmentsAction()

  return (
    <div className={STYLES.page}>
      <header className={STYLES.header}>
        <h1 className={STYLES.title}>{APPROVAL_QUEUE_LABELS.sectionTitle}</h1>
        <p className={STYLES.subtitle}>{APPROVAL_QUEUE_LABELS.sectionSubtitle}</p>
      </header>
      <ApprovalQueue
        appointments={result.ok ? result.appointments : []}
        loadError={result.ok ? null : result.error}
      />
    </div>
  )
}
