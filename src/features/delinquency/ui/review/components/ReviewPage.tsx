import { requireAdminSession } from '@/features/auth'
import { reviewService } from '@/features/delinquency/ui/review/services/review-service'
import { ReviewView } from './ReviewView'

export async function ReviewPage() {
  await requireAdminSession()
  return <ReviewView model={await reviewService.load()} />
}
