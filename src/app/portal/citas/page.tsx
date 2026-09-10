import { getAuthSession } from '@/features/auth'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Mis Citas | Portal Clienta LASHARY',
}

export default async function ClientCitasPage() {
  const session = await getAuthSession()
  if (!session?.user) redirect('/login')

  return (
    <div className="space-y-4">
      <div className="border-b border-brand-border pb-4">
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-brand-dark">
          Mis Citas
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          Historial y próximas citas agendadas (US-AGE-05).
        </p>
      </div>
      <div className="rounded-xl border border-brand-border bg-brand-surface p-6 shadow-sm">
        <p className="text-sm text-brand-muted">
          Espacio reservado para la visualización y gestión de citas de la clienta.
        </p>
      </div>
    </div>
  )
}
