import { redirect } from 'next/navigation'
import { productRoutes } from '@/features/store/client'

export default function AdminStoreRedirect() {
  redirect(productRoutes.admin)
}
