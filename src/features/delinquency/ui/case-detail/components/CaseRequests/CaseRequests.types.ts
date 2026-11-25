import type { DetailRequest } from '@/features/delinquency/domain/case-detail'

export interface CaseRequestsProps {
  requests: readonly DetailRequest[]
}
