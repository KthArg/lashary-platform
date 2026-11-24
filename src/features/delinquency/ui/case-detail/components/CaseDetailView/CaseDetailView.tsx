import Link from 'next/link'
import { formatMoney, moneyFromColones } from '@/shared/money'
import { formatStudioDate } from '@/shared/studio-time'
import type { CaseDetail } from '@/features/delinquency/domain/case-detail'
import { HISTORY_PATH, historyDetailPath } from '../../../history/constants/history-strings'
import { appointmentText } from '../../../utils/appointment-text'
import { CaseRequests } from '../CaseRequests'
import { CaseTimeline } from '../CaseTimeline'
import { caseDetailMessages as copy } from '../../constants/case-detail-strings'
import { caseDetailViewStyles as STYLES } from './CaseDetailView.styles'
import type { CaseDetailViewProps } from './CaseDetailView.types'

interface DetailRow {
  label: string
  value: string
}

const colones = (amount: number): string => formatMoney(moneyFromColones(amount))

const optionalRow = (label: string, value: string | null): DetailRow[] => (value === null ? [] : [{ label, value }])

const buildRows = (detail: CaseDetail): DetailRow[] => [
  { label: copy.labels.originAmount, value: colones(detail.pending) },
  { label: copy.labels.balanceToday, value: colones(detail.pendingToday) },
  { label: copy.labels.appointment, value: appointmentText(detail.appointment, copy.appointmentMissing) },
  { label: copy.labels.detectedAt, value: formatStudioDate(detail.detectedAt) },
  ...optionalRow(copy.labels.decidedAt, detail.decidedAt === null ? null : formatStudioDate(detail.decidedAt)),
  ...optionalRow(copy.labels.settledAt, detail.settledAt === null ? null : formatStudioDate(detail.settledAt)),
  ...optionalRow(copy.labels.exceptionReason, detail.exceptionReason),
  ...optionalRow(copy.labels.exceptionAmount, detail.exceptionAmount === null ? null : colones(detail.exceptionAmount)),
]

export function CaseDetailView({ model }: CaseDetailViewProps) {
  const backLink = (
    <Link href={HISTORY_PATH} className={STYLES.back}>
      {copy.backToHistory}
    </Link>
  )

  if (model.status === 'not_found') {
    return (
      <div className={STYLES.main}>
        {backLink}
        <h1 className={STYLES.title}>{copy.notFound.title}</h1>
        <p className={STYLES.empty}>{copy.notFound.body}</p>
      </div>
    )
  }

  if (model.status === 'error') {
    return (
      <div className={STYLES.main}>
        {backLink}
        <h1 className={STYLES.title}>{copy.title}</h1>
        <div role="alert" className={STYLES.alertError}>
          <span>{copy.loadError}</span>
          <Link href={historyDetailPath(model.caseId)} className={STYLES.retry}>
            {copy.retry}
          </Link>
        </div>
      </div>
    )
  }

  const { detail } = model

  return (
    <div className={STYLES.main}>
      {backLink}
      <header className={STYLES.header}>
        <h1 className={STYLES.title}>{detail.clientName ?? copy.clientFallback}</h1>
        <span className={STYLES.state}>
          <span className="sr-only">{copy.stateLabel}</span>
          {copy.states[detail.state]}
        </span>
      </header>
      {detail.appointmentUnavailable ? <p role="status" className={STYLES.notice}>{copy.appointmentUnavailable}</p> : null}
      <dl className={STYLES.list}>
        {buildRows(detail).map((row) => (
          <div key={row.label}>
            <dt className={STYLES.term}>{row.label}</dt>
            <dd className={STYLES.value}>{row.value}</dd>
          </div>
        ))}
      </dl>
      <CaseRequests requests={detail.requests} />
      <CaseTimeline events={detail.timeline} unavailable={detail.timelineUnavailable} />
    </div>
  )
}
