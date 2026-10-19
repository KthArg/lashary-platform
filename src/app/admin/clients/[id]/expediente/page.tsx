import { requireAdminSession } from '@/features/auth'
import { RecordLoadError, RecordView, viewRecordAction } from '@/features/clients'
import type { AdminRecordPageProps } from './expediente.types'

export const metadata = {
  title: 'Expediente | LASHARY Beauty Studio',
  description: 'Expediente de la clienta',
}

export default async function AdminRecordPage({ params }: AdminRecordPageProps) {
  await requireAdminSession()
  const { id } = await params
  const result = await viewRecordAction(id)
  if (!result.ok) return <RecordLoadError message={result.error} />
  return <RecordView current={result.current} history={result.history} />
}
