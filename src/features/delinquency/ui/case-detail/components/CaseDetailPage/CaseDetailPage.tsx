import { requireAdminSession } from '@/features/auth'
import { caseDetailService } from '../../services/case-detail-service'
import { CaseDetailView } from '../CaseDetailView'

export async function CaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdminSession()
  const { id } = await params
  const model = await caseDetailService.load(id)
  return <CaseDetailView model={model} />
}
