import {
  APPOINTMENT_STATUS_LABELS,
  DEPOSIT_STATUS_LABELS,
  HISTORY_LABELS,
  HISTORY_TABLE_HEADERS,
} from '../../constants/history-strings'
import { formatAppointmentDate } from '../../format-appointment-date'
import { AppointmentNotes } from '../AppointmentNotes'
import { appointmentHistoryStyles as STYLES } from './AppointmentHistory.styles'
import type { AppointmentHistoryProps } from './AppointmentHistory.types'

export function AppointmentHistory({ clientId, entries }: AppointmentHistoryProps) {
  return (
    <section className={STYLES.section} aria-labelledby="appointment-history-title">
      <h2 id="appointment-history-title" className={STYLES.title}>{HISTORY_LABELS.title}</h2>
      {entries.length === 0 ? (
        <p className={STYLES.empty}>{HISTORY_LABELS.empty}</p>
      ) : (
        <div className={STYLES.tableWrapper}>
          <table className={STYLES.table}>
            <thead>
              <tr>
                {Object.values(HISTORY_TABLE_HEADERS).map((header) => (
                  <th key={header} scope="col" className={STYLES.headerCell}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry.id} className={STYLES.row}>
                  <th scope="row" className={STYLES.dateCell}>{formatAppointmentDate(entry.startsAtMs)}</th>
                  <td className={STYLES.cell}>{entry.serviceName}</td>
                  <td className={STYLES.cell}>{APPOINTMENT_STATUS_LABELS[entry.status]}</td>
                  <td className={STYLES.cell}>{DEPOSIT_STATUS_LABELS[entry.depositStatus]}</td>
                  <td className={STYLES.notesCell}>
                    <AppointmentNotes clientId={clientId} appointmentId={entry.id} notes={entry.notes} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
