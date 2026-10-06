import type { ClientRecord } from '../domain/client.types'

export type SaveClientResult = { ok: true; client: ClientRecord } | { ok: false; error: string }

export type ListClientsResult =
  | { ok: true; clients: ClientRecord[]; total: number; page: number; pageSize: number }
  | { ok: false; error: string }
