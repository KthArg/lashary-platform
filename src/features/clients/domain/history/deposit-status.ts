import type { DepositAmounts, DepositStatus } from './appointment-history.types'

export function depositStatusOf({ depositRequired, depositRegistered }: DepositAmounts): DepositStatus {
  if (depositRequired === 0) return 'none'
  return depositRegistered >= depositRequired ? 'registered' : 'pending'
}
