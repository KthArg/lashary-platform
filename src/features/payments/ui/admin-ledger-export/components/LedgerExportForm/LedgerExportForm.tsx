import { LEDGER_EXPORT_QUERY } from '@/features/payments/domain/ledger-export-range'
import {
  LEDGER_EXPORT_ROUTE,
  ledgerExportMessages,
  type LedgerExportErrorReason,
} from '../../constants/ledger-export-strings'
import { ledgerExportFormStyles as STYLES } from './LedgerExportForm.styles'

export interface LedgerExportFormProps {
  errorReason?: LedgerExportErrorReason
}

export function LedgerExportForm({ errorReason }: LedgerExportFormProps) {
  return (
    <section className={STYLES.section} aria-labelledby="ledger-export-title">
      <h2 id="ledger-export-title" className={STYLES.heading}>
        {ledgerExportMessages.title}
      </h2>
      <p className={STYLES.subtitle}>{ledgerExportMessages.subtitle}</p>
      {errorReason && (
        <p role="alert" className={STYLES.error}>
          {ledgerExportMessages.errors[errorReason]}
        </p>
      )}
      <form method="get" action={LEDGER_EXPORT_ROUTE} className={STYLES.form}>
        <label className={STYLES.fieldLabel}>
          <span className={STYLES.labelText}>{ledgerExportMessages.fromLabel}</span>
          <input type="date" name={LEDGER_EXPORT_QUERY.from} required className={STYLES.fieldInput} />
        </label>
        <label className={STYLES.fieldLabel}>
          <span className={STYLES.labelText}>{ledgerExportMessages.toLabel}</span>
          <input type="date" name={LEDGER_EXPORT_QUERY.to} required className={STYLES.fieldInput} />
        </label>
        <button type="submit" className={STYLES.submitButton}>
          {ledgerExportMessages.submit}
        </button>
      </form>
    </section>
  )
}
