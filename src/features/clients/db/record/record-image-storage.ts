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
