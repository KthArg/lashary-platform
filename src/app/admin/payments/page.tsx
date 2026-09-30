import { requireAdminSession } from '@/features/auth'
import { ExemptClientForm } from '@/features/payments'
import { adminPaymentsStyles as Styles } from './payments.styles'

export const metadata = {
  title: 'Anticipos | LASHARY Beauty Studio',
  description: 'Exonerar el anticipo requerido a una clienta específica.',
}

export default async function AdminPaymentsPage() {
  await requireAdminSession()

  return (
    <div className={Styles.main}>
      <ExemptClientForm />
    </div>
  )
}
