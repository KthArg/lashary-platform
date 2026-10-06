import { ok, err, isErr, type Result } from '@/shared/result'
import { CLIENTS_LIST_LIMITS } from './clients-list-limits'
import type { ClientRecord } from '../domain/client.types'
import type { ClientRepository, ListClientsQuery } from './ports'

export interface ClientsListPage { clients: ClientRecord[]; total: number; page: number; pageSize: number }

const readPage = (page: unknown): number => (Number.isInteger(page) && (page as number) > 0 ? (page as number) : 0)

const readPageSize = (pageSize: unknown): number =>
  (CLIENTS_LIST_LIMITS.pageSizes as readonly number[]).includes(pageSize as number)
    ? (pageSize as number)
    : CLIENTS_LIST_LIMITS.defaultPageSize

const readName = (name: unknown): string | null => {
  if (typeof name !== 'string') return null
  return name.trim().slice(0, CLIENTS_LIST_LIMITS.nameFilterMaxLength) || null
}

export const listClients =
  (repo: ClientRepository) =>
  async (query: ListClientsQuery = {}): Promise<Result<ClientsListPage, 'failed'>> => {
    const page = readPage(query?.page)
    const pageSize = readPageSize(query?.pageSize)
    const found = await repo.listPage({ offset: page * pageSize, limit: pageSize, name: readName(query?.name) })
    if (isErr(found)) return err('failed')
    return ok({ ...found.value, page, pageSize })
  }
