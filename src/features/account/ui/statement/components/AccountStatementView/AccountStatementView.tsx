import { statementMessages as COPY } from '../../constants/statement-strings'
import { money, toAccountEntryView } from '../../utils/statement-format'
import { AccountEntryCard } from '../AccountEntryCard'
import { accountStatementViewStyles as STYLES } from './AccountStatementView.styles'
import type { AccountStatementViewProps } from './AccountStatementView.types'

const HEADING_ID = 'estado-de-cuenta'

export function AccountStatementView(props: AccountStatementViewProps) {
  return (
    <section aria-labelledby={HEADING_ID} className={STYLES.section}>
      <div>
        <h2 id={HEADING_ID} className={STYLES.heading}>
          {COPY.title}
        </h2>
        <p className={STYLES.subtitle}>{COPY.subtitle}</p>
      </div>
      {'error' in props ? (
        <div role="alert" className={STYLES.alertError}>
          <span>{props.error}</span>
        </div>
      ) : (
        <>
          {props.account.totalOwed === 0 ? (
            <p className={STYLES.empty}>{COPY.empty}</p>
          ) : (
            <>
              <div className={STYLES.total}>
                <p className={STYLES.totalLabel}>{COPY.totalLabel}</p>
                <p className={STYLES.totalAmount}>{money(props.account.totalOwed)}</p>
              </div>
              <p className={STYLES.note}>{COPY.paymentInstructions}</p>
              <p className={STYLES.note}>{COPY.verificationNote}</p>
            </>
          )}
          <ul className={STYLES.list}>
            {props.account.entries.map((entry) => (
              <AccountEntryCard key={entry.caseId} entry={toAccountEntryView(entry)} />
            ))}
          </ul>
        </>
      )}
    </section>
  )
}
