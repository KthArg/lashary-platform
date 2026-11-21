import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { isErr, isOk } from '@/shared/result'
import { CURRENT_PROFILE_FUNCTION, currentClient, RECEIPT_LINK_SECONDS, RECEIPTS_BUCKET, receiptLinks, receiptStorage } from '../receipt-storage'

type FakeError = { message: string } | null

function createFakeDb(options: { uploadError?: FakeError; rpcData?: unknown; rpcError?: FakeError } = {}) {
  const calls: unknown[][] = []
  const db = {
    storage: {
      from: (bucket: string) => ({
        upload: async (path: string, bytes: Uint8Array, opts: unknown) => {
          calls.push(['upload', bucket, path, bytes.byteLength, opts])
          return { data: options.uploadError ? null : { path }, error: options.uploadError ?? null }
        },
      }),
    },
    rpc: async (name: string) => {
      calls.push(['rpc', name])
      return { data: options.rpcData ?? null, error: options.rpcError ?? null }
    },
  } as unknown as SupabaseClient
  return { db, calls }
}

const file = { bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]), contentType: 'application/pdf' }

describe('receiptStorage.upload', () => {
  it('sube al bucket de comprobantes con el tipo real y sin reemplazar uno existente', async () => {
    const { db, calls } = createFakeDb()
    const result = await receiptStorage(db).upload('clienta-1/archivo-1.pdf', file)

    expect(isOk(result)).toBe(true)
    expect(calls).toEqual([
      ['upload', RECEIPTS_BUCKET, 'clienta-1/archivo-1.pdf', 5, { contentType: 'application/pdf', upsert: false }],
    ])
  })

  it('un error de Storage es un fallo de almacenamiento', async () => {
    const { db } = createFakeDb({ uploadError: { message: 'new row violates row-level security policy' } })
    const result = await receiptStorage(db).upload('otra/archivo.pdf', file)

    expect(isErr(result) && result.error.code).toBe('DELINQUENCY_STORAGE_FAILED')
  })
})

describe('currentClient.currentClientId', () => {
  it('pregunta al contrato de clients quién es la clienta de la sesión', async () => {
    const { db, calls } = createFakeDb({ rpcData: '00000000-0000-0000-0000-0000000016c2' })
    const result = await currentClient(db).currentClientId()

    expect(calls).toEqual([['rpc', CURRENT_PROFILE_FUNCTION]])
    expect(isOk(result) && result.value).toBe('00000000-0000-0000-0000-0000000016c2')
  })

  it('una sesión sin perfil de clienta devuelve null', async () => {
    const { db } = createFakeDb({ rpcData: null })
    const result = await currentClient(db).currentClientId()

    expect(isOk(result) && result.value).toBeNull()
  })

  it('una respuesta con forma inesperada es un fallo, no una clienta inventada', async () => {
    const { db } = createFakeDb({ rpcData: { id: 'x' } })
    const result = await currentClient(db).currentClientId()

    expect(isErr(result) && result.error.code).toBe('DELINQUENCY_STORAGE_FAILED')
  })

  it('un error de la base es un fallo de almacenamiento', async () => {
    const { db } = createFakeDb({ rpcError: { message: 'caída' } })
    const result = await currentClient(db).currentClientId()

    expect(isErr(result) && result.error.code).toBe('DELINQUENCY_STORAGE_FAILED')
  })
})

describe('receiptLinks.signedUrls', () => {
  function createLinksDb(response: { data: unknown; error: { message: string } | null }) {
    const calls: unknown[][] = []
    const db = {
      storage: {
        from: (bucket: string) => ({
          createSignedUrls: async (paths: string[], seconds: number) => (calls.push([bucket, paths, seconds]), response),
        }),
      },
    } as unknown as SupabaseClient
    return { db, calls }
  }

  it('firma los comprobantes del bucket privado con vida corta y omite los que no se pudieron firmar', async () => {
    const { db, calls } = createLinksDb({
      data: [
        { path: 'a/1.pdf', signedUrl: 'https://firmado/1', error: null },
        { path: 'a/2.pdf', signedUrl: null, error: 'Object not found' },
      ],
      error: null,
    })
    const result = await receiptLinks(db).signedUrls(['a/1.pdf', 'a/2.pdf'])

    expect(calls).toEqual([[RECEIPTS_BUCKET, ['a/1.pdf', 'a/2.pdf'], RECEIPT_LINK_SECONDS]])
    expect(isOk(result) && [...result.value]).toEqual([['a/1.pdf', 'https://firmado/1']])
  })

  it('sin rutas no llama a Storage', async () => {
    const { db, calls } = createLinksDb({ data: [], error: null })
    expect(isOk(await receiptLinks(db).signedUrls([]))).toBe(true)
    expect(calls).toEqual([])
  })

  it('un error de Storage es un fallo de almacenamiento', async () => {
    const { db } = createLinksDb({ data: null, error: { message: 'caída' } })
    const result = await receiptLinks(db).signedUrls(['a/1.pdf'])
    expect(isErr(result) && result.error.code).toBe('DELINQUENCY_STORAGE_FAILED')
  })
})
