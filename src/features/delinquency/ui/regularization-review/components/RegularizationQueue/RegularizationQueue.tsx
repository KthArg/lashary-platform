import Link from "next/link";
import { formatMoney, moneyFromColones } from "@/shared/money";
import { formatStudioDateTime } from "@/shared/studio-time";
import {
  DELINQUENCY_ADMIN_PATH,
  reviewMessages,
} from "@/features/delinquency/ui/review/constants/review-strings";
import {
  QUEUE_LIMIT,
  queueMessages as copy,
} from "../../constants/queue-strings";
import { QueueFeedback } from "../QueueFeedback";
import { RegularizationDecision } from "../RegularizationDecision";
import { regularizationQueueStyles as STYLES } from "./RegularizationQueue.styles";
import type { RegularizationQueueProps } from "./RegularizationQueue.types";

const amount = (colones: number): string =>
  formatMoney(moneyFromColones(colones));
const HEADING_ID = "delinquency-receipts";

export function RegularizationQueue({ model }: RegularizationQueueProps) {
  return (
    <section className={STYLES.section} aria-labelledby={HEADING_ID}>
      <h2 id={HEADING_ID} className={STYLES.sectionTitle}>
        {copy.title}
      </h2>
      <QueueFeedback>
        {model.status === "error" ? (
          <div role="alert" className={STYLES.alertError}>
            <span>{copy.loadError}</span>
            <Link href={DELINQUENCY_ADMIN_PATH} className={STYLES.retry}>
              {copy.retry}
            </Link>
          </div>
        ) : model.queue.items.length === 0 ? (
          <p className={STYLES.empty}>{copy.empty}</p>
        ) : (
          <>
            <p role="note" className={STYLES.hint}>
              {copy.hint}
            </p>
            <ul className={STYLES.list}>
              {model.queue.items.map((item) => {
                const name = item.clientName ?? reviewMessages.clientFallback;
                return (
                  <li key={item.requestId} className={STYLES.card}>
                    <h3 className={STYLES.cardTitle}>{name}</h3>
                    <dl className={STYLES.meta}>
                      <dt className={STYLES.term}>{copy.declaredLabel}</dt>
                      <dd>{amount(item.declaredAmount)}</dd>
                      <dt className={STYLES.term}>{copy.pendingTodayLabel}</dt>
                      <dd>{amount(item.pendingToday)}</dd>
                      <dt className={STYLES.term}>{copy.submittedLabel}</dt>
                      <dd>{formatStudioDateTime(item.submittedAt)}</dd>
                      {item.reference && (
                        <>
                          <dt className={STYLES.term}>{copy.referenceLabel}</dt>
                          <dd>{item.reference}</dd>
                        </>
                      )}
                    </dl>
                    {item.receiptUrl ? (
                      <a
                        href={item.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={copy.openReceiptLabel(name)}
                        className={STYLES.receiptLink}
                      >
                        {copy.openReceipt}
                      </a>
                    ) : (
                      <p className={STYLES.receiptUnavailable}>
                        {copy.receiptUnavailable}
                      </p>
                    )}
                    <RegularizationDecision
                      requestId={item.requestId}
                      declaredAmount={item.declaredAmount}
                      pendingToday={item.pendingToday}
                    />
                  </li>
                );
              })}
            </ul>
            {model.queue.more && (
              <p className={STYLES.more}>{copy.more(QUEUE_LIMIT)}</p>
            )}
          </>
        )}
      </QueueFeedback>
    </section>
  );
}
