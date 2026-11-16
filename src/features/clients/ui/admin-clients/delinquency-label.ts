import { formatMoney, moneyFromColones } from '@/shared/money'
import type { ClientDelinquency } from '@/features/clients/domain/client-delinquency'
import { CLIENTS_TABLE_TEXTS } from './constants/client-strings'

// Solo `active` es morosidad; «Por revisar» todavía no tiene consecuencias (DOM-012).
export function delinquencyLabel(delinquency: ClientDelinquency): string {
  return delinquency.state === 'active'
    ? CLIENTS_TABLE_TEXTS.delinquencyActive(formatMoney(moneyFromColones(delinquency.pending)))
    : CLIENTS_TABLE_TEXTS.delinquencyToReview
}
