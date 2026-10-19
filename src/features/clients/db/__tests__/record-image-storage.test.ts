import { describe, it, expect } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  RECORD_IMAGES_BUCKET,
  RECORD_IMAGE_URL_SECONDS,
  createSupabaseRecordImageStorage,
  signSupabaseRecordImages,
} from '../record/record-image-storage'

function fakeStorage(error: { message: string } | null) {
  const calls: unknown[][] = []
  const db = {
    storage: {
      from: (bucket: string) => ({
        upload: async (...args: unknown[]) => (calls.push([bucket, ...args]), { error }),
      }),
    },
  } as unknown as SupabaseClient
  return { db, calls }
}

const image = { bytes: new Uint8Array([1, 2, 3]), contentType: 'image/png' }

describe('createSupabaseRecordImageStorage — el bucket privado del expediente (criterio 5)', () => {
  it('sube al bucket del expediente con su tipo y sin pisar un archivo existente', async () => {
    const { db, calls } = fakeStorage(null)
    await createSupabaseRecordImageStorage(db).upload('client-1/image-1.png', image)
    expect(calls).toEqual([[RECORD_IMAGES_BUCKET, 'client-1/image-1.png', image.bytes, { contentType: 'image/png', upsert: false }]])
  })

  it('si Storage rechaza la subida, lo dice', async () => {
    const { db } = fakeStorage({ message: 'rls' })
    await expect(createSupabaseRecordImageStorage(db).upload('client-1/image-1.png', image)).rejects.toThrow('no se pudo subir')
  })
})

describe('signSupabaseRecordImages — URLs firmadas de vida corta (criterio 5, SEC-006)', () => {
  it('firma las rutas por el tiempo corto acordado y devuelve una URL por ruta', async () => {
    const calls: unknown[][] = []
    const db = {
      storage: {
        from: (bucket: string) => ({
          createSignedUrls: async (...args: unknown[]) => (
            calls.push([bucket, ...args]),
            { data: [{ path: 'client-1/a.png', signedUrl: 'http://storage.local/firmada', error: null }], error: null }
          ),
        }),
      },
    } as unknown as SupabaseClient
    expect(await signSupabaseRecordImages(db, ['client-1/a.png'])).toEqual({ 'client-1/a.png': 'http://storage.local/firmada' })
    expect(calls).toEqual([[RECORD_IMAGES_BUCKET, ['client-1/a.png'], RECORD_IMAGE_URL_SECONDS]])
  })
})
