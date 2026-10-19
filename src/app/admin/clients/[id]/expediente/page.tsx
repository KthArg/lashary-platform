import { requireAdminSession } from '@/features/auth'
import {
  RecordLoadError,
  RecordView,
  listCategoryOptionsAction,
  listTechniqueOptionsAction,
  viewRecordAction,
} from '@/features/clients'
import type { AdminRecordPageProps } from './expediente.types'

export const metadata = {
  title: 'Expediente | LASHARY Beauty Studio',
  description: 'Expediente de la clienta',
}

export default async function AdminRecordPage({ params }: AdminRecordPageProps) {
  await requireAdminSession()
  const { id } = await params
  const [result, techniqueOptions, categoryOptions] = await Promise.all([
    viewRecordAction(id),
    listTechniqueOptionsAction(),
    listCategoryOptionsAction(),
  ])
  if (!result.ok) return <RecordLoadError message={result.error} />
  return (
    <RecordView clientId={id} current={result.current} history={result.history}
      techniques={techniqueOptions.ok ? techniqueOptions.techniques : []}
      categories={categoryOptions.ok ? categoryOptions.categories : []} />
  )
}
