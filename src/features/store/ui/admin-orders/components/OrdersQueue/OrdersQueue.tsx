import { formatMoney, moneyFromColones } from '@/shared/money'
import { formatStudioDateTime } from '@/shared/studio-time'
import { ORDERS_ADMIN_PATH, orderQueueMessages as copy } from '../../constants/order-queue-strings'
import { OrderDecision } from '../OrderDecision'
import { QueueFeedback } from '../QueueFeedback'
import { ordersQueueStyles as STYLES } from './OrdersQueue.styles'
import type { OrdersQueueProps } from './OrdersQueue.types'

const amount = (colones: number): string => formatMoney(moneyFromColones(colones))
const HEADING_ID = 'store-order-receipts'

export function OrdersQueue({ model }: OrdersQueueProps) {
  return (
    <section className={STYLES.section} aria-labelledby={HEADING_ID}>
      <h2 id={HEADING_ID} className={STYLES.sectionTitle}>
        {copy.title}
      </h2>
      <QueueFeedback>
        {model.status === 'error' ? (
          <div role="alert" className={STYLES.alertError}>
            <span>{copy.loadError}</span>
            <a href={ORDERS_ADMIN_PATH} className={STYLES.retry}>
              {copy.retry}
            </a>
          </div>
        ) : model.orders.length === 0 ? (
          <p className={STYLES.empty}>{copy.empty}</p>
        ) : (
          <>
            <p role="note" className={STYLES.hint}>
              {copy.hint}
            </p>
            <ul className={STYLES.list}>
              {model.orders.map((order) => {
                const name = order.clientName ?? copy.clientFallback
                return (
                  <li key={order.id} className={STYLES.card}>
                    <h3 className={STYLES.cardTitle}>{name}</h3>
                    <dl className={STYLES.meta}>
                      <dt className={STYLES.term}>{copy.totalLabel}</dt>
                      <dd>{amount(order.totalColones)}</dd>
                      <dt className={STYLES.term}>{copy.contactLabel}</dt>
                      <dd>{order.contactPhone}</dd>
                      <dt className={STYLES.term}>{copy.submittedLabel}</dt>
                      <dd>{formatStudioDateTime(order.createdAt)}</dd>
                    </dl>
                    <p className={STYLES.term}>{copy.linesLabel}</p>
                    <p className={STYLES.lines}>
                      {order.lines.map((line) => `${line.productName} × ${line.quantity}`).join(', ')}
                    </p>
                    {order.receiptUrl ? (
                      <a
                        href={order.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={copy.openReceiptLabel(name)}
                        className={STYLES.receiptLink}
                      >
                        {copy.openReceipt}
                      </a>
                    ) : (
                      <p className={STYLES.receiptUnavailable}>{copy.receiptUnavailable}</p>
                    )}
                    <OrderDecision orderId={order.id} />
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </QueueFeedback>
    </section>
  )
}
