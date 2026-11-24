import { getAuthSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { isErr } from '@/shared/result'
import { loadMyLatestOrder } from '../../../../application/my-orders/load-my-latest-order'
import { myOrdersRepository } from '../../../../db/my-orders-repository'
import type { MyLatestOrder } from '../../../../application/my-orders/ports'

export async function loadMyLatestOrderData(): Promise<MyLatestOrder | null> {
  const session = await getAuthSession()
  if (session === null) return null

  const db = await createClient()
  const result = await loadMyLatestOrder(myOrdersRepository(db))()
  if (isErr(result)) return null
  return result.value
}
