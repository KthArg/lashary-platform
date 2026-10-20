import type { ClientRecord } from '@/features/clients'

export type ExemptClientActionState = {
  status: 'idle' | 'ok' | 'invalid' | 'forbidden' | 'conflict'
  message?: string
  problems?: string[]
}

export type SearchClientsResult = { ok: true; clients: ClientRecord[] } | { ok: false }

export const initialExemptClientActionState: ExemptClientActionState = { status: 'idle' }
