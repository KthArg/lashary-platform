import type { ReactNode } from 'react'
import { requireAdminSession } from '@/features/auth'
import { CatalogTabs } from './catalog-tabs'
import { catalogStyles as s } from './catalog.styles'

const SECTION_TITLE = 'Catálogo'
const SECTION_SUBTITLE = 'Técnicas y paquetes de servicios del estudio'

// Compuerta de staff para toda la ruta /admin/catalog. requireAdminSession redirige a /admin
// si no hay sesión admin/superadmin; RLS conserva la autorización real (SEC-001).
// La sesión y el cierre de sesión viven en la barra lateral del layout /admin.
export default async function AdminCatalogLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  await requireAdminSession()

  return (
    <>
      <header className={s.sectionHeader}>
        <div>
          <h1 className={s.sectionTitle}>{SECTION_TITLE}</h1>
          <p className={s.sectionSubtitle}>{SECTION_SUBTITLE}</p>
        </div>
        <CatalogTabs />
      </header>
      {children}
    </>
  )
}
