import { AUTH_ROLES, getAuthSession } from '@/features/auth'
import type { PurchaseAccess } from './components/ProductDetail/ProductDetail.types'

export async function getPurchaseAccess(): Promise<PurchaseAccess> {
  const session = await getAuthSession()
  return session?.role === AUTH_ROLES.CLIENTE ? 'customer' : 'guest'
}
