import type { Result } from '@/shared/result'
import type { ClientRecord } from '../domain/client.types'

export interface ListClientsQuery { page?: number; pageSize?: number; name?: string }

export interface ClientWriteModel { fullName: string; phone: string; email: string; notes: string | null }

export interface ClientPhoneEntry { id: string; phone: string }

export interface ClientsPageRequest { offset: number; limit: number; name: string | null }

export interface ClientsPage { clients: ClientRecord[]; total: number }

export type RepositoryFailure = 'repository-failed'

export interface ClientRepository {
  findByPhoneDigits(digits: string): Promise<Result<ClientPhoneEntry[], RepositoryFailure>>
  insertVerified(client: ClientWriteModel): Promise<Result<ClientRecord, RepositoryFailure>>
  update(id: string, client: ClientWriteModel): Promise<Result<ClientRecord | null, RepositoryFailure>>
  listPage(request: ClientsPageRequest): Promise<Result<ClientsPage, RepositoryFailure>>
}
