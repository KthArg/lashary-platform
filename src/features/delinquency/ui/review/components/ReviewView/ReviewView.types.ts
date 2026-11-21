import type { ReactNode } from 'react'
import type { ReviewViewModel } from '@/features/delinquency/ui/review/services/review-service'

export interface ReviewViewProps {
  model: ReviewViewModel
  // La cola de comprobantes por revisar (US-MOR-03), arriba porque es lo que pide acción.
  queue?: ReactNode
}
