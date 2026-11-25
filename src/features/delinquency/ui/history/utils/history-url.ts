import { HISTORY_DEFAULT_PAGE_SIZE } from '@/features/delinquency/domain/case-history'
import type { HistoryQuery, HistoryQueryInput } from '@/features/delinquency/domain/case-history'
import { HISTORY_PATH } from '../constants/history-strings'

export type HistorySearchParams = Partial<Record<'filter' | 'page' | 'pageSize', string | string[]>>

const firstValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value

const readNumber = (value: string | undefined): number | undefined => {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export const readHistoryParams = (params: HistorySearchParams): HistoryQueryInput => ({
  filter: firstValue(params.filter),
  page: readNumber(firstValue(params.page)),
  pageSize: readNumber(firstValue(params.pageSize)),
})

export const buildHistoryUrl = (query: HistoryQuery): string => {
  const params = new URLSearchParams()
  if (query.filter !== 'all') params.set('filter', query.filter)
  if (query.page > 0) params.set('page', String(query.page))
  if (query.pageSize !== HISTORY_DEFAULT_PAGE_SIZE) params.set('pageSize', String(query.pageSize))
  const queryString = params.toString()
  return queryString ? `${HISTORY_PATH}?${queryString}` : HISTORY_PATH
}
