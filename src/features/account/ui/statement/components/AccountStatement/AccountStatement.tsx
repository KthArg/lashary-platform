import { regularizationService } from '@/features/delinquency'
import { AccountStatementView } from '../AccountStatementView'

// Componente de servidor: lee el estado de cuenta con la sesión de la clienta por la entrada de delinquency.
export async function AccountStatement() {
  const result = await regularizationService.loadMyAccount()
  return result.ok ? <AccountStatementView account={result.account} /> : <AccountStatementView error={result.message} />
}
