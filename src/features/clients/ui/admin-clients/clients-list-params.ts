import { readVisitDate } from '../../domain/list/visit-range'

type ClientsListParamName = 'page' | 'pageSize' | 'name' | 'visitFrom' | 'visitTo'

export type ClientsListSearchParams = Partial<Record<ClientsListParamName, string | string[]>>

export interface ClientsListParams {
  page: number | undefined
  pageSize: number | undefined
  name: string
  visitFrom: string
  visitTo: string
}

const firstValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value

const readNumber = (value: string | undefined): number | undefined => {
  if (!value) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function readClientsListParams(params: ClientsListSearchParams): ClientsListParams {
  return {
    page: readNumber(firstValue(params.page)),
    pageSize: readNumber(firstValue(params.pageSize)),
    name: firstValue(params.name)?.trim() ?? '',
    visitFrom: readVisitDate(firstValue(params.visitFrom)) ?? '',
    visitTo: readVisitDate(firstValue(params.visitTo)) ?? '',
  }
}
