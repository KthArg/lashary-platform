import { requireAdminSession } from '@/features/auth'
import { reviewService } from '@/features/delinquency/ui/review/services/review-service'
import { regularizationQueueService } from '@/features/delinquency/ui/regularization-review/services/queue-service'
import { RegularizationQueue } from '@/features/delinquency/ui/regularization-review/components/RegularizationQueue'
import { ReviewView } from '../ReviewView'

export async function ReviewPage() {
  await requireAdminSession()
  const [model, queue] = await Promise.all([reviewService.load(), regularizationQueueService.load()])
  return <ReviewView model={model} queue={<RegularizationQueue model={queue} />} />
}
