import { moneyFromColones, formatMoney } from '@/shared/money'

export function formatPackagePrice(colones: number): string {
  return formatMoney(moneyFromColones(colones))
}
