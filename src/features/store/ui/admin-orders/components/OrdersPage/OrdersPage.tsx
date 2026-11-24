import { requireAdminSession } from '@/features/auth'
import { orderQueueService } from '../../services/order-queue-service'
import { OrdersQueue } from '../OrdersQueue'

export async function OrdersPage() {
  await requireAdminSession()
  const model = await orderQueueService.load()
  return <OrdersQueue model={model} />
}
