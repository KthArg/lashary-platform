import type { OrdersPageSearchParams } from '../../orders-page-params'

export interface OrdersPageProps {
  searchParams?: Promise<OrdersPageSearchParams>
}
