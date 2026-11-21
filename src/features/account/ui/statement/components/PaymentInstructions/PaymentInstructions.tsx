import { statementMessages as COPY } from '../../constants/statement-strings'
import { STUDIO_PAYMENT } from '../../constants/studio-payment'
import { paymentInstructionsStyles as STYLES } from './PaymentInstructions.styles'

const HEADING_ID = 'como-pagar'

export function PaymentInstructions() {
  return (
    <section aria-labelledby={HEADING_ID} className={STYLES.box}>
      <h3 id={HEADING_ID} className={STYLES.heading}>
        {COPY.paymentTitle}
      </h3>
      <p className={STYLES.text}>{COPY.paymentInstructions}</p>
      <dl className={STYLES.details}>
        <dt className={STYLES.term}>{COPY.sinpeLabel}</dt>
        <dd className={STYLES.value}>{STUDIO_PAYMENT.sinpeNumber}</dd>
        <dt className={STYLES.term}>{COPY.holderLabel}</dt>
        <dd className={STYLES.value}>{STUDIO_PAYMENT.holder}</dd>
      </dl>
      <p className={STYLES.text}>
        {COPY.questionsLead}{' '}
        <a href={STUDIO_PAYMENT.whatsappHref} target="_blank" rel="noopener noreferrer" className={STYLES.link}>
          {COPY.whatsappLink}
        </a>{' '}
        {COPY.questionsJoin}{' '}
        <a href={`mailto:${STUDIO_PAYMENT.email}`} className={STYLES.link}>
          {STUDIO_PAYMENT.email}
        </a>
        .
      </p>
    </section>
  )
}
