export type OrdersTab = 'pendientes' | 'historial'

export type OrdersPageSearchParams = Partial<Record<'tab' | 'page', string | string[]>>

export interface OrdersPageParams {
  tab: OrdersTab
  page: number
}

const firstValue = (value: string | string[] | undefined): string | undefined =>
  Array.isArray(value) ? value[0] : value

export function readOrdersPageParams(params: OrdersPageSearchParams): OrdersPageParams {
  const tab: OrdersTab = firstValue(params.tab) === 'historial' ? 'historial' : 'pendientes'
  const rawPage = Number(firstValue(params.page))
  const page = Number.isInteger(rawPage) && rawPage > 0 ? rawPage : 0
  return { tab, page }
}
