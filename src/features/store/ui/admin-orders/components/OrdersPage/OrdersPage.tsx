import { requireAdminSession } from '@/features/auth'
import { readOrdersPageParams } from '../../orders-page-params'
import { orderHistoryService } from '../../services/order-history-service'
import { orderQueueService } from '../../services/order-queue-service'
import { OrdersHistory } from '../OrdersHistory'
import { OrdersQueue } from '../OrdersQueue'
import { OrdersTabs } from '../OrdersTabs'
import type { OrdersPageProps } from './OrdersPage.types'

export async function OrdersPage({ searchParams }: OrdersPageProps) {
  await requireAdminSession()
  const { tab, page } = readOrdersPageParams((await searchParams) ?? {})

  if (tab === 'historial') {
    const model = await orderHistoryService.load(page)
    return (
      <>
        <OrdersTabs active="historial" />
        <OrdersHistory model={model} />
      </>
    )
  }

  const model = await orderQueueService.load()
  return (
    <>
      <OrdersTabs active="pendientes" />
      <OrdersQueue model={model} />
    </>
  )
}
