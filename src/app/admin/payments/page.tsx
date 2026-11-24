import { requireAdminSession } from '@/features/auth'
import {
  ExemptClientForm,
  LedgerExportForm,
  LEDGER_EXPORT_ERROR_PARAM,
  isLedgerExportErrorReason,
} from '@/features/payments'
import { adminPaymentsStyles as STYLES } from './payments.styles'

export const metadata = {
  title: 'Anticipos | LASHARY Beauty Studio',
  description: 'Exonerar el anticipo requerido a una clienta específica.',
}

interface AdminPaymentsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}

export default async function AdminPaymentsPage({ searchParams }: AdminPaymentsPageProps) {
  await requireAdminSession()
  const exportError = (await searchParams)[LEDGER_EXPORT_ERROR_PARAM]

  return (
    <div className={STYLES.main}>
      <ExemptClientForm />
      <LedgerExportForm errorReason={isLedgerExportErrorReason(exportError) ? exportError : undefined} />
    </div>
  )
}
