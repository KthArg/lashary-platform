// Los archivos de ruta client (loading/error) toman el texto del entry point cliente-seguro
// (ARCH-003) — el barrel principal (index.ts) arrastra el acceso a datos de servidor
// (next/headers) al bundle cliente.
import { catalogMessages } from '@/features/catalog/client'
import { catalogStyles } from './catalog.styles'

export default function Loading() {
  return (
    <main className={catalogStyles.main}>
      <h1 className={catalogStyles.title}>{catalogMessages.admin.title}</h1>
      <div role="status" aria-live="polite" className={catalogStyles.loadingBox}>
        <span className={catalogStyles.spinner} aria-hidden="true" />
        <span>{catalogMessages.admin.loading}</span>
      </div>
    </main>
  )
}
