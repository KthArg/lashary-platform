import type { ClientListItem, ClientRecord } from '../../../domain/client.types'
import type { ClientDelinquency } from '@/features/clients/domain/client-delinquency'

export type SaveClientResult = { ok: true; client: ClientRecord } | { ok: false; error: string }

export type ListClientsResult =
  | {
      ok: true
      clients: ClientListItem[]
      total: number
      page: number
      pageSize: number
      delinquency: Record<string, ClientDelinquency>
      delinquencyAvailable: boolean
    }
  | { ok: false; reason: 'invalid-visit-range' | 'failed'; error: string }

export type GetClientResult =
  | { ok: true; client: ClientRecord; delinquencyLabel: string | null }
  | { ok: false; reason: 'not-found' | 'failed'; error: string }
