import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { err, ok } from '@/shared/result'
import { delinquencyStorageFailed } from '../domain/errors'
import type { CurrentClientPort, ReceiptLinks, ReceiptStorage } from '../application/ports'
import { UNEXPECTED_ROW } from './case-row'

export const RECEIPTS_BUCKET = 'delinquency-receipts'
export const CURRENT_PROFILE_FUNCTION = 'clients_current_profile_id'
export const RECEIPT_LINK_SECONDS = 300

const profileIdSchema = z.string().guid().nullable()

export function receiptStorage(db: SupabaseClient): ReceiptStorage {
  return {
    async upload(path, file) {
      const { error } = await db.storage
        .from(RECEIPTS_BUCKET)
        .upload(path, file.bytes, { contentType: file.contentType, upsert: false })
      if (error) return err(delinquencyStorageFailed(error.message))
      return ok(undefined)
    },
  }
}

export function currentClient(db: SupabaseClient): CurrentClientPort {
  return {
    async currentClientId() {
      const { data, error } = await db.rpc(CURRENT_PROFILE_FUNCTION)
      if (error) return err(delinquencyStorageFailed(error.message))
      const parsed = profileIdSchema.safeParse(data)
      if (!parsed.success) return err(delinquencyStorageFailed(UNEXPECTED_ROW))
      return ok(parsed.data)
    },
  }
}

export function receiptLinks(db: SupabaseClient): ReceiptLinks {
  return {
    async signedUrls(paths) {
      if (paths.length === 0) return ok(new Map<string, string>())
      const { data, error } = await db.storage.from(RECEIPTS_BUCKET).createSignedUrls([...paths], RECEIPT_LINK_SECONDS)
      if (error) return err(delinquencyStorageFailed(error.message))
      const links = new Map<string, string>()
      for (const item of data ?? []) {
        if (item.path && item.signedUrl && !item.error) links.set(item.path, item.signedUrl)
      }
      return ok(links)
    },
  }
}
