import { redirect } from 'next/navigation'
import { rutasAdminProductos } from '@/features/store/client'

export default function AdminStoreRedirect() {
  redirect(rutasAdminProductos.admin)
}
