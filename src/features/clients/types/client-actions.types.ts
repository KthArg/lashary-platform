import type { ClientRecord } from './client.types'

/** Lo que devuelve un server action de clientas: nunca lanza por un fallo esperado, lo nombra. */
export type SaveClientResult = { ok: true; client: ClientRecord } | { ok: false; error: string }

export type ListClientsResult = { ok: true; clients: ClientRecord[] } | { ok: false; error: string }
