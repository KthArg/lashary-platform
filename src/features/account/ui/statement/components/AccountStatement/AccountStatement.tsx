import { regularizationService } from '@/features/delinquency'
import { AccountStatementView } from '../AccountStatementView'

export async function AccountStatement() {
  const result = await regularizationService.loadMyAccount()
  return result.ok ? <AccountStatementView account={result.account} /> : <AccountStatementView error={result.message} />
}
