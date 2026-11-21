import type { AccountEntry } from '@/features/delinquency'
import { formatMoney, moneyFromColones } from '@/shared/money'
import { formatStudioDate } from '@/shared/studio-time'
import { statementMessages as COPY } from '../constants/statement-strings'

export const money = (colones: number): string => formatMoney(moneyFromColones(colones))

export type AccountEntryView = {
  caseId: string
  title: string
  since: string
  status: string | null
  canSend: boolean
  hasPendingRequest: boolean
  maxAmount: number
}

// Lo que la tarjeta muestra de cada morosidad. Se puede enviar comprobante mientras la morosidad está activa;
// si hay uno en revisión, enviar otro lo reemplaza.
export function toAccountEntryView(entry: AccountEntry): AccountEntryView {
  const request = entry.request
  let status: string | null = null
  // Una saldada muestra el pago que la saldó; el título ya dice que está saldada.
  if (entry.caseState === 'settled') status = request?.state === 'approved' && request.approvedAmount !== null ? COPY.approved(money(request.approvedAmount)) : null
  else if (request?.state === 'pending_approval') status = COPY.inReview(money(request.declaredAmount))
  else if (request?.state === 'approved' && request.approvedAmount !== null) status = COPY.approved(money(request.approvedAmount))
  else if (request?.state === 'rejected' && request.rejectionReason) status = COPY.rejected(request.rejectionReason)

  return {
    caseId: entry.caseId,
    title: entry.caseState === 'settled' ? COPY.settled : COPY.owed(money(entry.pending)),
    since: COPY.pendingSince(formatStudioDate(entry.since)),
    status,
    canSend: entry.caseState === 'active' && entry.pending > 0,
    hasPendingRequest: request?.state === 'pending_approval',
    maxAmount: entry.pending,
  }
}
