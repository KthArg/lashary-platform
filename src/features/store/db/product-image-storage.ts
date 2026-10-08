import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient } from '@/shared/lib/supabase/server'
import type { ProductImageStorage } from '../application/admin-products/ports'

const BUCKET = 'store-product-images'

function createProductImageStorage(db: SupabaseClient): ProductImageStorage {
  const bucket = db.storage.from(BUCKET)
  const publicPrefix = bucket.getPublicUrl('').data.publicUrl

  return {
    async upload(path: string, bytes: Uint8Array, contentType: string): Promise<string> {
      const { error } = await bucket.upload(path, bytes, { contentType, upsert: false })
      if (error) throw new Error(`${BUCKET}.upload: ${error.message}`)
      return bucket.getPublicUrl(path).data.publicUrl
    },

    async remove(path: string): Promise<void> {
      const { error } = await bucket.remove([path])
      if (error) throw new Error(`${BUCKET}.remove: ${error.message}`)
    },

    pathFromUrl(url: string): string | null {
      if (!url.startsWith(publicPrefix)) return null
      const path = decodeURI(url.slice(publicPrefix.length))
      return path.length > 0 ? path : null
    },
  }
}

export async function productImageStorage(): Promise<ProductImageStorage> {
  return createProductImageStorage(await createClient())
}
