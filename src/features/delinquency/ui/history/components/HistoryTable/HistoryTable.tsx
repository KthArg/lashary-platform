import Link from 'next/link'
import { formatMoney, moneyFromColones } from '@/shared/money'
import { formatStudioDate } from '@/shared/studio-time'
import { appointmentText } from '../../../utils/appointment-text'
import { HISTORY_ICON_PATHS } from '../../constants/history-icons'
import { historyDetailPath, historyMessages as copy } from '../../constants/history-strings'
import { historyTableStyles as STYLES } from './HistoryTable.styles'
import type { HistoryTableProps } from './HistoryTable.types'

const { actions: actionsHeader, ...dataHeaders } = copy.headers

export function HistoryTable({ items }: HistoryTableProps) {
  return (
    <div className={STYLES.wrapper}>
      <table className={STYLES.table}>
        <thead>
          <tr>
            {Object.values(dataHeaders).map((header) => (
              <th key={header} scope="col" className={STYLES.headerCell}>
                {header}
              </th>
            ))}
            <th scope="col" className={STYLES.headerCellActions}>
              {actionsHeader}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const clientName = item.clientName ?? copy.clientFallback
            return (
              <tr key={item.caseId} className={STYLES.row}>
                <th scope="row" className={STYLES.nameCell}>{clientName}</th>
                <td className={STYLES.cell}>{formatMoney(moneyFromColones(item.pending))}</td>
                <td className={STYLES.cell}>{appointmentText(item.appointment, copy.appointmentMissing)}</td>
                <td className={STYLES.cell}>{formatStudioDate(item.detectedAt)}</td>
                <td className={STYLES.cell}>{copy.states[item.state]}</td>
                <td className={STYLES.actionsCell}>
                  <Link
                    href={historyDetailPath(item.caseId)}
                    aria-label={copy.detailLinkLabel(clientName)}
                    title={copy.detailLink}
                    className={STYLES.detailLink}
                  >
                    <svg className={STYLES.detailIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
                      <path d={HISTORY_ICON_PATHS.eye} />
                    </svg>
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
