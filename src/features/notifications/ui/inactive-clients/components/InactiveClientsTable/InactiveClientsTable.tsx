import { formatStudioDate } from '@/shared/studio-time'
import { canQueueInactiveReminder } from '@/features/notifications/domain/inactive-reminder'
import { inactiveClientsMessages as copy } from '../../constants/inactive-clients-strings'
import { INACTIVE_SEND_FIELDS, inactiveSendMessages as sendCopy } from '../../constants/inactive-send-strings'
import { lastReminderLabel } from '../../utils/last-reminder-label'
import { inactiveClientsTableStyles as STYLES } from './InactiveClientsTable.styles'
import type { InactiveClientsTableProps } from './InactiveClientsTable.types'

export function InactiveClientsTable({ clients, selection }: InactiveClientsTableProps) {
  return (
    <div className={STYLES.wrapper}>
      <table className={STYLES.table}>
        <caption className={STYLES.caption}>{copy.tableCaption}</caption>
        <thead>
          <tr>
            {selection && <th scope="col">{sendCopy.columnSelect}</th>}
            <th scope="col">{copy.columns.name}</th>
            <th scope="col">{copy.columns.lastVisit}</th>
            <th scope="col">{copy.columns.lastReminder}</th>
            {selection && <th scope="col">{sendCopy.columnSend}</th>}
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => {
            const unavailable = !canQueueInactiveReminder(client) || Boolean(selection?.pending)
            return (
              <tr key={client.clientId}>
                {selection && (
                  <td>
                    <input
                      type="checkbox"
                      name={INACTIVE_SEND_FIELDS.selected}
                      value={client.clientId}
                      disabled={unavailable}
                      aria-label={sendCopy.select(client.fullName)}
                      className={STYLES.checkbox}
                    />
                  </td>
                )}
                <td>
                  <span className={STYLES.name}>{client.fullName}</span>
                  {client.optedOut && <span className={STYLES.optedOut}>{copy.optedOut}</span>}
                </td>
                <td>{client.lastVisitAt === null ? copy.neverVisited : formatStudioDate(client.lastVisitAt)}</td>
                <td>{lastReminderLabel(client.lastReminder)}</td>
                {selection && (
                  <td>
                    <button
                      type="submit"
                      name={INACTIVE_SEND_FIELDS.single}
                      value={client.clientId}
                      disabled={unavailable}
                      aria-label={sendCopy.sendOne(client.fullName)}
                      className={STYLES.sendOne}
                    >
                      {sendCopy.sendOneLabel}
                    </button>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
