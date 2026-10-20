import { notFound } from 'next/navigation'
import { requireAdminSession } from '@/features/auth'
import { RecordLoadError, RecordView, readCategoryOptions, readRecord, readTechniqueOptions } from '@/features/clients'
import type { AdminRecordPageProps } from './expediente.types'

export const metadata = {
  title: 'Expediente | LASHARY Beauty Studio',
  description: 'Expediente de la clienta',
}

export default async function AdminRecordPage({ params }: AdminRecordPageProps) {
  await requireAdminSession()
  const { id } = await params
  const [result, techniqueOptions, categoryOptions] = await Promise.all([
    readRecord(id),
    readTechniqueOptions(),
    readCategoryOptions(),
  ])
  if (!result.ok && result.notFound) notFound()
  if (!result.ok) return <RecordLoadError message={result.error} />
  return (
    <RecordView clientId={id} current={result.current} history={result.history} initial={result.initial}
      techniques={techniqueOptions.ok ? techniqueOptions.techniques : []}
      categories={categoryOptions.ok ? categoryOptions.categories : []} imageUrls={result.imageUrls} />
  )
}
