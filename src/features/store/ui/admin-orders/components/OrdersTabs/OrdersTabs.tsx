import Link from 'next/link'
import { ORDERS_ADMIN_PATH, orderTabsMessages as copy } from '../../constants/order-queue-strings'
import type { OrdersTab } from '../../orders-page-params'
import { ordersTabsStyles as STYLES } from './OrdersTabs.styles'
import type { OrdersTabsProps } from './OrdersTabs.types'

const TABS: ReadonlyArray<{ key: OrdersTab; label: string; href: string }> = [
  { key: 'pendientes', label: copy.pendingTab, href: ORDERS_ADMIN_PATH },
  { key: 'historial', label: copy.historyTab, href: `${ORDERS_ADMIN_PATH}?tab=historial` },
]

export function OrdersTabs({ active }: OrdersTabsProps) {
  return (
    <div role="tablist" aria-label={copy.tabsLabel} className={STYLES.tabs}>
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={tab.href}
          role="tab"
          aria-current={active === tab.key ? 'page' : undefined}
          className={active === tab.key ? STYLES.tabActive : STYLES.tab}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
