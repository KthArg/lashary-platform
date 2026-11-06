'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { catalogRoutes } from '@/features/catalog/client'
import { productRoutes } from '@/features/store/client'
import { CATALOG_SECTION } from './catalog-section.strings'
import { catalogStyles as STYLES } from './catalog.styles'

const CATALOG_TABS = [
  { label: CATALOG_SECTION.tabs.products, href: productRoutes.admin },
  { label: CATALOG_SECTION.tabs.techniques, href: catalogRoutes.admin },
  { label: CATALOG_SECTION.tabs.packages, href: catalogRoutes.packagesAdmin },
  { label: CATALOG_SECTION.tabs.promotions, href: catalogRoutes.promotionsAdmin },
]

export function CatalogTabs() {
  const pathname = usePathname()

  return (
    <div role="tablist" className={STYLES.tabs}>
      {CATALOG_TABS.map((tab) => {
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-current={isActive ? 'page' : undefined}
            className={isActive ? STYLES.tabActive : STYLES.tab}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
