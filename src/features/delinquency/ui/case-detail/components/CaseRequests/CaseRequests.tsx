import { formatMoney, moneyFromColones } from '@/shared/money'
import { formatStudioDate } from '@/shared/studio-time'
import type { DetailRequest } from '@/features/delinquency/domain/case-detail'
import { caseDetailMessages as copy } from '../../constants/case-detail-strings'
import { caseRequestsStyles as STYLES } from './CaseRequests.styles'
import type { CaseRequestsProps } from './CaseRequests.types'

interface RequestRow {
  label: string
  value: string
}

const colones = (amount: number): string => formatMoney(moneyFromColones(amount))

const optionalRow = (label: string, value: string | null): RequestRow[] => (value === null ? [] : [{ label, value }])

const buildRows = (request: DetailRequest): RequestRow[] => [
  { label: copy.requests.declaredAmount, value: colones(request.declaredAmount) },
  ...optionalRow(copy.requests.approvedAmount, request.approvedAmount === null ? null : colones(request.approvedAmount)),
  ...optionalRow(copy.requests.rejectionReason, request.rejectionReason),
  ...optionalRow(copy.requests.reviewedAt, request.reviewedAt === null ? null : formatStudioDate(request.reviewedAt)),
  ...optionalRow(copy.requests.reference, request.reference),
]

export function CaseRequests({ requests }: CaseRequestsProps) {
  return (
    <section aria-labelledby="case-requests-title" className={STYLES.section}>
      <h2 id="case-requests-title" className={STYLES.title}>
        {copy.requests.title}
      </h2>
      {requests.length === 0 ? (
        <p className={STYLES.empty}>{copy.requests.empty}</p>
      ) : (
        <ul className={STYLES.list}>
          {requests.map((request) => (
            <li key={request.id} className={STYLES.item}>
              <div className={STYLES.header}>
                <span className={STYLES.value}>{formatStudioDate(request.createdAt)}</span>
                <span className={STYLES.state}>
                  <span className="sr-only">{copy.requests.stateLabel}</span>
                  {copy.requests.states[request.state]}
                </span>
              </div>
              <dl className={STYLES.details}>
                {buildRows(request).map((row) => (
                  <div key={row.label}>
                    <dt className={STYLES.term}>{row.label}</dt>
                    <dd className={STYLES.value}>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
