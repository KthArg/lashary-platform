import type { ReactNode } from 'react'
import type { ReviewViewModel } from '../../services/review-service'

export interface ReviewViewProps {
  model: ReviewViewModel
  queue?: ReactNode
}
