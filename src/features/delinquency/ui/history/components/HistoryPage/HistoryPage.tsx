import { requireAdminSession } from '@/features/auth'
import { normalizeHistoryQuery } from '@/features/delinquency/domain/case-history'
import { historyService } from '../../services/history-service'
import { readHistoryParams, type HistorySearchParams } from '../../utils/history-url'
import { HistoryView } from '../HistoryView'

export async function HistoryPage({ searchParams }: { searchParams: Promise<HistorySearchParams> }) {
  await requireAdminSession()
  const query = normalizeHistoryQuery(readHistoryParams(await searchParams))
  const model = await historyService.load(query)
  return <HistoryView model={model} query={query} />
}
