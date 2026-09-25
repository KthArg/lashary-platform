import { requireAdminSession } from '@/features/auth'
import { ExemptClientForm } from '@/features/payments'
import { adminPaymentsStyles as s } from './payments.styles'

export const metadata = {
  title: 'Anticipos | LASHARY Beauty Studio',
  description: 'Exonerar el anticipo requerido a una clienta específica.',
}

// Compuerta de staff (SEC-001, mensaje amable): requireAdminSession redirige a /admin si no hay
// sesión admin/superadmin; RLS conserva la autorización real. Sin loading.tsx/error.tsx propios
// todavía — esta página no hace una carga de datos bloqueante antes del primer render (a
// diferencia de /admin/catalog); se agregan si un incremento futuro los necesita, junto con el
// client.ts que ese boundary exigiría (ver nota en catalog/ui/messages.ts).
export default async function AdminPaymentsPage() {
  await requireAdminSession()

  return (
    <main className={s.main}>
      <ExemptClientForm />
    </main>
  )
}
