import type { ClientRecord } from './client.types'

export type SaveClientResult = { ok: true; client: ClientRecord } | { ok: false; error: string }

export interface ListClientsQuery { page?: number; pageSize?: number; name?: string }

export type ListClientsResult =
  | { ok: true; clients: ClientRecord[]; total: number; page: number; pageSize: number }
  | { ok: false; error: string }
