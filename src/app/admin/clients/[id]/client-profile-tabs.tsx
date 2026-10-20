'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clientProfileStyles as STYLES } from './client-profile.styles'
import type { ClientProfileTabsProps } from './client-profile.types'

export function ClientProfileTabs({ label, tabs }: ClientProfileTabsProps) {
  const pathname = usePathname()

  return (
    <nav aria-label={label} className={STYLES.tabs}>
      {tabs.map((tab) => {
        const isActive = pathname === tab.href
        return (
          <Link key={tab.href} href={tab.href} aria-current={isActive ? 'page' : undefined}
            className={isActive ? STYLES.tabActive : STYLES.tab}>
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
