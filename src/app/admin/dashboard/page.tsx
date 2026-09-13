import { requireAdminSession } from '@/features/auth'

export const metadata = {
  title: 'Dashboard | Panel Administrativo LASHARY',
}

export default async function AdminDashboardPage() {
  const session = await requireAdminSession()

  return (
    <div className="space-y-4">
      <div className="border-b border-brand-border pb-4">
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-brand-dark">
          Bienvenida al panel de LASHARY
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          Sesión activa como: <span className="font-semibold text-brand-dark">{session.user.email}</span> ({session.role})
        </p>
      </div>
      <div className="rounded-xl border border-brand-border bg-brand-surface p-6 shadow-sm">
        <p className="text-sm text-brand-dark">
          Panel administrativo central. Selecciona una sección en la barra lateral para comenzar.
        </p>
      </div>
    </div>
  )
}
