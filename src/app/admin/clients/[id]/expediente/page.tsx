import { requireAdminSession } from '@/features/auth'
import { RECORD_LABELS, RecordLoadError, RecordView, viewRecordAction } from '@/features/clients'
import { adminRecordStyles as STYLES } from './expediente.styles'
import type { AdminRecordPageProps } from './expediente.types'

export const metadata = {
  title: 'Expediente | LASHARY Beauty Studio',
  description: 'Expediente de la clienta',
}

export default async function AdminRecordPage({ params }: AdminRecordPageProps) {
  await requireAdminSession()
  const { id } = await params
  const result = await viewRecordAction(id)

  return (
    <div className={STYLES.page}>
      <h1 className={STYLES.title}>{RECORD_LABELS.pageTitle}</h1>
      {result.ok ? <RecordView current={result.current} history={result.history} /> : <RecordLoadError message={result.error} />}
    </div>
  )
}
