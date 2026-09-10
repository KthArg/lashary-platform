import { getAuthSession } from '@/features/auth'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Mi Cuenta | Portal Clienta LASHARY',
}

export default async function ClientCuentaPage() {
  const session = await getAuthSession()
  if (!session?.user) redirect('/login')

  return (
    <div className="space-y-4">
      <div className="border-b border-brand-border pb-4">
        <h1 className="font-serif text-2xl md:text-3xl font-bold text-brand-dark">
          Mi Cuenta
        </h1>
        <p className="text-sm text-brand-muted mt-1">
          Ficha de clienta, estado de cuenta e información personal (US-CLI-06 / US-MOR-03).
        </p>
      </div>
      <div className="rounded-xl border border-brand-border bg-brand-surface p-6 shadow-sm space-y-2">
        <p className="text-sm font-semibold text-brand-dark">
          Correo: <span className="font-normal text-brand-muted">{session.user.email}</span>
        </p>
        {session.profile?.phone && (
          <p className="text-sm font-semibold text-brand-dark">
            Teléfono: <span className="font-normal text-brand-muted">{session.profile.phone}</span>
          </p>
        )}
      </div>
    </div>
  )
}
