import { formatMoney, moneyFromColones } from '@/shared/money'
import { formatStudioDateTime } from '@/shared/studio-time'
import { ORDERS_ADMIN_PATH, orderHistoryMessages as copy, orderStateLabels } from '../../constants/order-queue-strings'
import { OrdersHistoryPagination } from '../OrdersHistoryPagination'
import { ordersHistoryStyles as STYLES } from './OrdersHistory.styles'
import type { OrdersHistoryProps } from './OrdersHistory.types'

const amount = (colones: number): string => formatMoney(moneyFromColones(colones))
const HEADING_ID = 'store-order-history'

export function OrdersHistory({ model }: OrdersHistoryProps) {
  return (
    <section className={STYLES.section} aria-labelledby={HEADING_ID}>
      <h2 id={HEADING_ID} className={STYLES.sectionTitle}>
        {copy.title}
      </h2>
      {model.status === 'error' ? (
        <div role="alert" className={STYLES.alertError}>
          <span>{copy.loadError}</span>
          <a href={`${ORDERS_ADMIN_PATH}?tab=historial`} className={STYLES.retry}>
            {copy.retry}
          </a>
        </div>
      ) : model.items.length === 0 ? (
        <p className={STYLES.empty}>{copy.empty}</p>
      ) : (
        <>
          <ul className={STYLES.list}>
            {model.items.map((order) => {
              const name = order.clientName ?? copy.clientFallback
              return (
                <li key={order.id} className={STYLES.card}>
                  <div className={STYLES.cardHeader}>
                    <h3 className={STYLES.cardTitle}>{name}</h3>
                    <span className={STYLES.badge[order.state]}>{orderStateLabels[order.state]}</span>
                  </div>
                  <dl className={STYLES.meta}>
                    <dt className={STYLES.term}>{copy.totalLabel}</dt>
                    <dd>{amount(order.totalColones)}</dd>
                    <dt className={STYLES.term}>{copy.submittedLabel}</dt>
                    <dd>{formatStudioDateTime(order.createdAt)}</dd>
                    {order.reviewedAt && (
                      <>
                        <dt className={STYLES.term}>{copy.reviewedLabel}</dt>
                        <dd>{formatStudioDateTime(order.reviewedAt)}</dd>
                      </>
                    )}
                  </dl>
                  <p className={STYLES.term}>{copy.linesLabel}</p>
                  <p className={STYLES.lines}>
                    {order.lines.map((line) => `${line.productName} × ${line.quantity}`).join(', ')}
                  </p>
                  {order.state === 'rejected' && order.rejectionReason && (
                    <p className={STYLES.rejectionReason}>
                      {copy.rejectionReasonLabel}: {order.rejectionReason}
                    </p>
                  )}
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
                </li>
              )
            })}
          </ul>
          <OrdersHistoryPagination page={model.page} pageSize={model.pageSize} total={model.total} />
        </>
      )}
    </section>
  )
}
