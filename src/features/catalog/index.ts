// Entry point público de la feature catalog (ARCH-003). Superficie de solo lectura y de
// servidor — el repositorio usa el cliente Supabase de servidor. Para Client Components
// (loading.tsx, error.tsx) que no pueden arrastrar next/headers al bundle, ver ./client.ts.
// Contrato y garantías: docs/contracts/catalog-api.md.

import {
  listTechniques as listTechniquesUseCase,
  getTechnique as getTechniqueUseCase,
} from './application/techniques/queries'
import {
  listPackages as listPackagesUseCase,
  getPackage as getPackageUseCase,
} from './application/packages/queries'
import { techniqueRepository } from './db/techniques/technique-repository'
import { packageRepository } from './db/packages/package-repository'
import type { ListTechniquesQuery } from './application/techniques/ports'
import type { Page } from './application/pagination'
import type { ListPackagesQuery } from './application/packages/ports'
import type { TechniqueView } from './domain/techniques/technique'

export async function listTechniques(
  query?: ListTechniquesQuery,
): Promise<Page<TechniqueView>> {
  return listTechniquesUseCase(await techniqueRepository())(query)
}

export async function getTechnique(id: string) {
  return getTechniqueUseCase(await techniqueRepository())(id)
}

export async function listPackages(query?: ListPackagesQuery) {
  return listPackagesUseCase(await packageRepository())(query)
}

export async function getPackage(id: string) {
  return getPackageUseCase(await packageRepository())(id)
}

export { SERVICE_FAMILIES } from './domain/techniques/technique'
export type {
  ServiceFamily,
  TechniqueView,
  TechniqueSnapshot,
} from './domain/techniques/technique'
export { TechniqueNotFound } from './domain/techniques/errors'
export type { PackageNotFound } from './domain/packages/errors'
export type { ListTechniquesQuery } from './application/techniques/ports'
export type { Page } from './application/pagination'
export type { ListPackagesQuery } from './application/packages/ports'
export type { PackageListItem } from './application/packages/queries'

// UI de administración (US-AGE-08). La compone la ruta src/app/admin/catalog/.
export { AdminCatalogPage } from './ui/techniques/components/AdminCatalogPage'
export { catalogMessages } from './ui/techniques/constants/technique-strings'

export { AdminPackagesPage } from './ui/packages/components/AdminPackagesPage'
