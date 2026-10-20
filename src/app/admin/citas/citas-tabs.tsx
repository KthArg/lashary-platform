'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CITAS_ROUTES, CITAS_SECTION } from './citas-section.strings'
import { adminCitasStyles as STYLES } from './citas.styles'

const CITAS_TABS = [
  { label: CITAS_SECTION.tabs.approvals, href: CITAS_ROUTES.approvals },
  { label: CITAS_SECTION.tabs.availability, href: CITAS_ROUTES.availability },
  { label: CITAS_SECTION.tabs.alerts, href: CITAS_ROUTES.alerts },
]

export function CitasTabs() {
  const pathname = usePathname()

  return (
    <nav aria-label={CITAS_SECTION.tabsLabel} className={STYLES.tabs}>
      {CITAS_TABS.map((tab) => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? 'page' : undefined}
            className={isActive ? STYLES.tabActive : STYLES.tab}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
