'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { catalogRoutes } from '@/features/catalog/ui/routes'
import { catalogStyles as s } from './catalog.styles'

// Paquetes llega con US-PROD-01: al actualizar esta rama con main, pasa a catalogRoutes.packagesAdmin.
// Productos (US-PROD-02, /admin/store) se suma cuando esa historia esté en main.
const CATALOG_TABS = [
  { label: 'Técnicas', href: catalogRoutes.admin },
  { label: 'Paquetes', href: '/admin/catalog/packages' },
]

export function CatalogTabs() {
  const pathname = usePathname()

  return (
    <div role="tablist" className={s.tabs}>
      {CATALOG_TABS.map((tab) => {
        // Coincidencia exacta: /admin/catalog es prefijo de /admin/catalog/packages.
        const isActive = pathname === tab.href
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-current={isActive ? 'page' : undefined}
            className={isActive ? s.tabActive : s.tab}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
