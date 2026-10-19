import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/server'
import type { RecordImageStorage } from '../../application/record/record-ports'

export const RECORD_IMAGES_BUCKET = 'clients-record-images'

export function createSupabaseRecordImageStorage(db: SupabaseClient): RecordImageStorage {
  return {
    async upload(path, image) {
      const { error } = await db.storage
        .from(RECORD_IMAGES_BUCKET)
        .upload(path, image.bytes, { contentType: image.contentType, upsert: false })
      if (error) throw new Error('no se pudo subir la imagen del expediente')
    },
  }
}

export async function recordImageStorage(): Promise<RecordImageStorage> {
  return createSupabaseRecordImageStorage(await createClient())
}

export const RECORD_IMAGE_URL_SECONDS = 300

export async function signSupabaseRecordImages(db: SupabaseClient, paths: readonly string[]): Promise<Record<string, string>> {
  const { data, error } = await db.storage.from(RECORD_IMAGES_BUCKET).createSignedUrls([...paths], RECORD_IMAGE_URL_SECONDS)
  if (error || !data) throw new Error('no se pudieron firmar las imágenes del expediente')
  return Object.fromEntries(
    data.flatMap((signed) => (signed.path && signed.signedUrl ? [[signed.path, signed.signedUrl]] : [])),
  )
}

export async function signRecordImageUrls(paths: readonly string[]): Promise<Record<string, string>> {
  return signSupabaseRecordImages(await createClient(), paths)
}
