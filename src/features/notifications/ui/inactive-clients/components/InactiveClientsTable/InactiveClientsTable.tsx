import { formatStudioDate } from '@/shared/studio-time'
import { inactiveClientsMessages as copy } from '../../constants/inactive-clients-strings'
import { lastReminderLabel } from '../../utils/last-reminder-label'
import { inactiveClientsTableStyles as STYLES } from './InactiveClientsTable.styles'
import type { InactiveClientsTableProps } from './InactiveClientsTable.types'

export function InactiveClientsTable({ clients }: InactiveClientsTableProps) {
  return (
    <div className={STYLES.wrapper}>
      <table className={STYLES.table}>
        <caption className={STYLES.caption}>{copy.tableCaption}</caption>
        <thead>
          <tr>
            <th scope="col">{copy.columns.name}</th>
            <th scope="col">{copy.columns.lastVisit}</th>
            <th scope="col">{copy.columns.lastReminder}</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.clientId}>
              <td>
                <span className={STYLES.name}>{client.fullName}</span>
                {client.optedOut && <span className={STYLES.optedOut}>{copy.optedOut}</span>}
              </td>
              <td>{client.lastVisitAt === null ? copy.neverVisited : formatStudioDate(client.lastVisitAt)}</td>
              <td>{lastReminderLabel(client.lastReminder)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
