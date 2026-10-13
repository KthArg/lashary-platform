import type { ReactNode } from 'react'
import { requireAdminSession } from '@/features/auth'
import { CatalogTabs } from './catalog-tabs'
import { CATALOG_SECTION } from './catalog-section.strings'
import { catalogStyles as STYLES } from './catalog.styles'

// Compuerta de staff para toda la ruta /admin/catalog. requireAdminSession redirige a /admin
// si no hay sesión admin/superadmin; RLS conserva la autorización real (SEC-001).
export default async function AdminCatalogLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await requireAdminSession()

  return (
    <>
      <header className={STYLES.sectionHeader}>
        <div>
          <h1 className={STYLES.sectionTitle}>{CATALOG_SECTION.title}</h1>
          <p className={STYLES.sectionSubtitle}>{CATALOG_SECTION.subtitle}</p>
        </div>
        <CatalogTabs />
      </header>
      {children}
    </>
  )
}
