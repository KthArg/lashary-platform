'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MOROSIDADES_ROUTES, MOROSIDADES_SECTION } from './morosidades-section.strings'
import { adminMorosidadesStyles as STYLES } from './morosidades.styles'

const isHistoryPath = (pathname: string): boolean =>
  pathname === MOROSIDADES_ROUTES.history || pathname.startsWith(`${MOROSIDADES_ROUTES.history}/`)

export function MorosidadesTabs() {
  const pathname = usePathname()
  const tabs = [
    { label: MOROSIDADES_SECTION.tabs.review, href: MOROSIDADES_ROUTES.review, isActive: !isHistoryPath(pathname) },
    { label: MOROSIDADES_SECTION.tabs.history, href: MOROSIDADES_ROUTES.history, isActive: isHistoryPath(pathname) },
  ]

  return (
    <nav aria-label={MOROSIDADES_SECTION.tabsLabel} className={STYLES.tabs}>
      {tabs.map((tab) => (
        <Link
          key={tab.href}
          href={tab.href}
          aria-current={tab.isActive ? 'page' : undefined}
          className={tab.isActive ? STYLES.tabActive : STYLES.tab}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  )
}
