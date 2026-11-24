import Link from 'next/link'
import { formatMoney, moneyFromColones } from '@/shared/money'
import { formatStudioDate, formatStudioDateTime } from '@/shared/studio-time'
import type { HistoryAppointment } from '@/features/delinquency/domain/case-history'
import { historyDetailPath, historyMessages as copy } from '../../constants/history-strings'
import { historyTableStyles as STYLES } from './HistoryTable.styles'
import type { HistoryTableProps } from './HistoryTable.types'

const appointmentText = (appointment: HistoryAppointment | null): string => {
  if (appointment === null) return copy.appointmentMissing
  const date = formatStudioDateTime(new Date(appointment.startsAtMs))
  return appointment.serviceName === null ? date : `${date} · ${appointment.serviceName}`
}

export function HistoryTable({ items }: HistoryTableProps) {
  return (
    <div className={STYLES.wrapper}>
      <table className={STYLES.table}>
        <thead>
          <tr>
            {Object.values(copy.headers).map((header) => (
              <th key={header} scope="col" className={STYLES.headerCell}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const clientName = item.clientName ?? copy.clientFallback
            return (
              <tr key={item.caseId} className={STYLES.row}>
                <th scope="row" className={STYLES.nameCell}>{clientName}</th>
                <td className={STYLES.cell}>{formatMoney(moneyFromColones(item.pending))}</td>
                <td className={STYLES.cell}>{appointmentText(item.appointment)}</td>
                <td className={STYLES.cell}>{formatStudioDate(item.detectedAt)}</td>
                <td className={STYLES.cell}>{copy.states[item.state]}</td>
                <td className={STYLES.cell}>
                  <Link
                    href={historyDetailPath(item.caseId)}
                    aria-label={copy.detailLinkLabel(clientName)}
                    className={STYLES.link}
                  >
                    {copy.detailLink}
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
