// Entry point público de la feature catalog (ARCH-003). Superficie de solo lectura y de
// servidor — el repositorio usa el cliente Supabase de servidor. Para Client Components
// (loading.tsx, error.tsx) que no pueden arrastrar next/headers al bundle, ver ./client.ts.
// Contrato y garantías: docs/contracts/catalog-api.md.

import {
  listTechniques as listTechniquesUseCase,
  getTechnique as getTechniqueUseCase,
  listPackages as listPackagesUseCase,
  getPackage as getPackageUseCase,
} from './application/queries'
import { techniqueRepository } from './db/technique-repository'
import { packageRepository } from './db/package-repository'
import type { ListTechniquesQuery, ListPackagesQuery, Page } from './application/ports'
import type { TechniqueView } from './domain/technique'

export async function listTechniques(
  query?: ListTechniquesQuery,
): Promise<Page<TechniqueView>> {
  return listTechniquesUseCase(await techniqueRepository())(query)
}

export async function getTechnique(id: string) {
  return getTechniqueUseCase(await techniqueRepository())(id)
}

// US-PROD-01 — paquetes: combos de dos o más técnicas con precio propio. Composición viva del
// catálogo (sin snapshot todavía; DOM-002 llega con US-AGE-04). create/update/deactivate no se
// exportan, igual que con técnicas: son admin, viven en catalog/ui/.
export async function listPackages(query?: ListPackagesQuery) {
  return listPackagesUseCase(await packageRepository())(query)
}

export async function getPackage(id: string) {
  return getPackageUseCase(await packageRepository())(id)
}

export { SERVICE_FAMILIES } from './domain/technique'
export type {
  ServiceFamily,
  TechniqueView,
  TechniqueSnapshot,
} from './domain/technique'
export { TechniqueNotFound, PackageNotFound } from './domain/errors'
export type { ListTechniquesQuery, ListPackagesQuery, Page } from './application/ports'
export type { PackageListItem } from './application/queries'

// UI de administración (US-AGE-08). La compone la ruta src/app/admin/catalog/.
export { AdminCatalogPage } from './ui/AdminCatalogPage'
export { catalogMessages } from './ui/messages'

// UI de administración de paquetes (US-PROD-01). La compone src/app/admin/catalog/packages/.
export { AdminPackagesPage } from './ui/AdminPackagesPage'
