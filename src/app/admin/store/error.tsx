'use client'

import { mensajesAdminProductos } from '@/features/store/client'
import { storeAdminStyles } from './store-admin.styles'

const m = mensajesAdminProductos.admin.error

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className={storeAdminStyles.main}>
      <h1 className={storeAdminStyles.title}>{mensajesAdminProductos.admin.title}</h1>
      <div role="alert" className={storeAdminStyles.errorBox}>
        <h2 className={storeAdminStyles.errorTitle}>{m.title}</h2>
        <p className={storeAdminStyles.errorBody}>{m.body}</p>
        <button type="button" onClick={reset} className={storeAdminStyles.retryButton}>
          {m.retry}
        </button>
      </div>
    </main>
  )
}
