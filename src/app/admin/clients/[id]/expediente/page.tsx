import { notFound } from 'next/navigation'
import { requireAdminSession } from '@/features/auth'
import { LoadError, RECORD_LABELS, RecordView, readCategoryOptions, readRecord, readTechniqueOptions } from '@/features/clients'
import { ClientRecordAftercare, loadClientAftercareForAdmin } from '@/features/notifications'
import type { AdminRecordPageProps } from './expediente.types'

export const metadata = {
  title: 'Expediente | LASHARY Beauty Studio',
  description: 'Expediente de la clienta',
}

export default async function AdminRecordPage({ params }: AdminRecordPageProps) {
  await requireAdminSession()
  const { id } = await params
  const [result, techniqueOptions, categoryOptions, aftercareResult] = await Promise.all([
    readRecord(id),
    readTechniqueOptions(),
    readCategoryOptions(),
    loadClientAftercareForAdmin(id),
  ])
  if (!result.ok && result.notFound) notFound()
  if (!result.ok) return <LoadError message={result.error} retryLabel={RECORD_LABELS.retry} />
  return (
    <>
      <RecordView clientId={id} current={result.current} history={result.history} initial={result.initial}
        techniques={techniqueOptions.ok ? techniqueOptions.techniques : []}
        categories={categoryOptions.ok ? categoryOptions.categories : []} imageUrls={result.imageUrls} />
      <ClientRecordAftercare result={aftercareResult} />
    </>
  )
}
