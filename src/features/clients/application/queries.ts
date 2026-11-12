import { ok, err, isErr, type Result } from '@/shared/result'
import { CLIENTS_LIST_LIMITS } from './clients-list-limits'
import { readVisitRange, type VisitRangeError } from '../domain/list/visit-range'
import type { ClientListItem, ClientRecord } from '../domain/client.types'
import type { ClientDelinquency } from '../domain/client-delinquency'
import type { ClientRepository, DelinquencyStatesPort, ListClientsQuery } from './ports'

export interface ClientsListPage {
  clients: ClientListItem[]
  total: number
  page: number
  pageSize: number
  // La morosidad es de otra feature: si no se pudo leer, el listado sigue y la columna dice «Sin dato».
  delinquency: Record<string, ClientDelinquency>
  delinquencyAvailable: boolean
}

export type ListClientsError = 'failed' | VisitRangeError

const readPage = (page: unknown): number => (Number.isInteger(page) && (page as number) > 0 ? (page as number) : 0)

const readPageSize = (pageSize: unknown): number =>
  (CLIENTS_LIST_LIMITS.pageSizes as readonly number[]).includes(pageSize as number)
    ? (pageSize as number)
    : CLIENTS_LIST_LIMITS.defaultPageSize

const readName = (name: unknown): string | null => {
  if (typeof name !== 'string') return null
  return name.trim().slice(0, CLIENTS_LIST_LIMITS.nameFilterMaxLength) || null
}

export const getClient =
  (repo: ClientRepository) =>
  async (id: string): Promise<Result<ClientRecord, 'not-found' | 'failed'>> => {
    const found = await repo.findById(id)
    if (isErr(found)) return err('failed')
    return found.value ? ok(found.value) : err('not-found')
  }

export const listClients =
  (repo: ClientRepository, delinquency?: DelinquencyStatesPort) =>
  async (query: ListClientsQuery = {}): Promise<Result<ClientsListPage, ListClientsError>> => {
    const visitRange = readVisitRange(query?.visitFrom, query?.visitTo)
    if (isErr(visitRange)) return visitRange
    const page = readPage(query?.page)
    const pageSize = readPageSize(query?.pageSize)
    const found = await repo.listPage({
      offset: page * pageSize,
      limit: pageSize,
      name: readName(query?.name),
      visitFrom: visitRange.value.from,
      visitTo: visitRange.value.to,
    })
    if (isErr(found)) return err('failed')

    const states = delinquency
      ? await delinquency.statesFor(found.value.clients.map((client) => client.id))
      : null
    const available = states !== null && !isErr(states)
    return ok({
      ...found.value,
      page,
      pageSize,
      delinquency: states !== null && !isErr(states) ? Object.fromEntries(states.value) : {},
      delinquencyAvailable: available,
    })
  }
