import { statementMessages } from '../../constants/statement-strings'
import { accountStatementLoadingStyles as STYLES } from './AccountStatementLoading.styles'

export function AccountStatementLoading() {
  return (
    <div role="status" aria-live="polite" className={STYLES.box}>
      {statementMessages.loading}
    </div>
  )
}
