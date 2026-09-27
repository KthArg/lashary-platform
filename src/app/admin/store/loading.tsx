import { mensajesAdminProductos } from '@/features/store/client'
import { storeAdminStyles } from './store-admin.styles'

export default function Loading() {
  return (
    <main className={storeAdminStyles.main}>
      <h1 className={storeAdminStyles.title}>{mensajesAdminProductos.admin.title}</h1>
      <div role="status" aria-live="polite" className={storeAdminStyles.loadingBox}>
        <span className={storeAdminStyles.spinner} aria-hidden="true" />
        <span>{mensajesAdminProductos.admin.loading}</span>
      </div>
    </main>
  )
}
