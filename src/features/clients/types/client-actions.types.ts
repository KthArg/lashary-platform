import type { ClientRecord } from './client.types'

/** Lo que devuelve un server action de clientas: nunca lanza por un fallo esperado, lo nombra. */
export type SaveClientResult = { ok: true; client: ClientRecord } | { ok: false; error: string }

/** Lo que pide la lista. Llega de la URL, asi que cada campo puede venir ausente o con basura. */
export interface ListClientsQuery { page?: number; pageSize?: number; name?: string }

/** `page` y `pageSize` son los que se usaron de verdad, ya saneados; `total` cuenta todas las paginas del filtro. */
export type ListClientsResult =
  | { ok: true; clients: ClientRecord[]; total: number; page: number; pageSize: number }
  | { ok: false; error: string }
