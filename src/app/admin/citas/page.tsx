import { requireAdminSession } from '@/features/auth'

export const metadata = {
  title: 'Citas | Panel Administrativo LASHARY',
}

export default async function AdminCitasPage() {
  await requireAdminSession()

  return (
    <div className="space-y-4">
      <div className="border-b border-brand-border pb-4">
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-brand-dark">
          Gestión de Citas
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          Módulo de agenda y catálogo de citas (US-AGE-08 / US-AGE-01).
        </p>
      </div>
      <div className="rounded-xl border border-brand-border bg-brand-surface p-6 shadow-sm">
        <p className="text-sm text-brand-muted">
          Espacio reservado para el catálogo de servicios y disponibilidad de agenda.
        </p>
      </div>
    </div>
  )
}
