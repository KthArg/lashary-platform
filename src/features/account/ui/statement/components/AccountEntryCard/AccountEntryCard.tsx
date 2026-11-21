import { RegularizationForm } from '@/features/delinquency'
import { accountEntryCardStyles as STYLES } from './AccountEntryCard.styles'
import type { AccountEntryCardProps } from './AccountEntryCard.types'

export function AccountEntryCard({ entry }: AccountEntryCardProps) {
  return (
    <li className={STYLES.card}>
      <p className={STYLES.title}>{entry.title}</p>
      <p className={STYLES.since}>{entry.since}</p>
      {entry.status && <p className={STYLES.status}>{entry.status}</p>}
      {entry.canSend && (
        <RegularizationForm
          caseId={entry.caseId}
          maxAmount={entry.maxAmount}
          hasPendingRequest={entry.hasPendingRequest}
        />
      )}
    </li>
  )
}
