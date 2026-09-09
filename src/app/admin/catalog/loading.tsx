// Los archivos de ruta client (loading/error) toman el texto del entry point cliente-seguro
// (ARCH-003) — el barrel principal (index.ts) arrastra el acceso a datos de servidor
// (next/headers) al bundle cliente.
import { catalogMessages } from '@/features/catalog/client'

export default function Loading() {
  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
      <h1 className="font-serif text-2xl">{catalogMessages.admin.title}</h1>
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-3 rounded-box border border-base-300 p-10"
      >
        <span className="loading loading-spinner" aria-hidden="true" />
        <span>{catalogMessages.admin.loading}</span>
      </div>
    </main>
  )
}
