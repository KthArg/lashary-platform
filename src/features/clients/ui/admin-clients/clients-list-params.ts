import { readAppointmentDate } from '../../domain/list/appointment-range'
import { readDelinquencyFilter, type DelinquencyFilter } from '../../domain/list/delinquency-filter'

type ClientsListParamName = 'page' | 'pageSize' | 'name' | 'appointmentFrom' | 'appointmentTo' | 'delinquency'

export type ClientsListSearchParams = Partial<Record<ClientsListParamName, string | string[]>>

export interface ClientsListParams {
  page: number | undefined
  pageSize: number | undefined
  name: string
  appointmentFrom: string
  appointmentTo: string
  delinquency: DelinquencyFilter | ''
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
    appointmentFrom: readAppointmentDate(firstValue(params.appointmentFrom)) ?? '',
    appointmentTo: readAppointmentDate(firstValue(params.appointmentTo)) ?? '',
    delinquency: readDelinquencyFilter(firstValue(params.delinquency)) ?? '',
  }
}
