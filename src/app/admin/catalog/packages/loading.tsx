// Ver nota en ../loading.tsx: el texto viene del entry point cliente-seguro, no del index.ts.
// Reusa los estilos de la ruta padre (../catalog.styles) — misma apariencia, sin duplicar.
import { catalogMessages } from '@/features/catalog/client'
import { catalogStyles } from '../catalog.styles'

const m = catalogMessages.packages.admin

export default function Loading() {
  return (
    <main className={catalogStyles.main}>
      <h1 className={catalogStyles.title}>{m.title}</h1>
      <div role="status" aria-live="polite" className={catalogStyles.loadingBox}>
        <span className={catalogStyles.spinner} aria-hidden="true" />
        <span>{m.loading}</span>
      </div>
    </main>
  )
}
