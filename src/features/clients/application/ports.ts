import type { Result } from '@/shared/result'
import type { ClientListItem, ClientRecord } from '../domain/client.types'
import type { ClientDelinquency } from '../domain/client-delinquency'

export interface ListClientsQuery { page?: number; pageSize?: number; name?: string; visitFrom?: string; visitTo?: string }

export interface ClientWriteModel { fullName: string; phone: string; email: string; notes: string | null }

export interface ClientPhoneEntry { id: string; phone: string }

export interface ClientsPageRequest {
  offset: number; limit: number; name: string | null; visitFrom: string | null; visitTo: string | null
}

export interface ClientsPage { clients: ClientListItem[]; total: number }

export type RepositoryFailure = 'repository-failed'

export interface DelinquencyStatesPort {
  statesFor(clientIds: string[]): Promise<Result<Map<string, ClientDelinquency>, RepositoryFailure>>
}

export interface ClientRepository {
  findById(id: string): Promise<Result<ClientRecord | null, RepositoryFailure>>
  findByPhoneDigits(digits: string): Promise<Result<ClientPhoneEntry[], RepositoryFailure>>
  insertVerified(client: ClientWriteModel): Promise<Result<ClientRecord, RepositoryFailure>>
  update(id: string, client: ClientWriteModel): Promise<Result<ClientRecord | null, RepositoryFailure>>
  listPage(request: ClientsPageRequest): Promise<Result<ClientsPage, RepositoryFailure>>
}
