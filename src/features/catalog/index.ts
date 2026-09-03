// Entry point público de la feature catalog (ARCH-003): lo único importable desde afuera.
// Contrato y garantías: docs/contracts/catalog-api.md.
// Superficie de solo lectura y de servidor — el repositorio usa el cliente Supabase de servidor.

import {
  listTechniques as listTechniquesUseCase,
  getTechnique as getTechniqueUseCase,
} from './application/queries'
import { techniqueRepository } from './db/technique-repository'
import type { ListTechniquesQuery, Page } from './application/ports'
import type { TechniqueView } from './domain/technique'

export async function listTechniques(
  query?: ListTechniquesQuery,
): Promise<Page<TechniqueView>> {
  return listTechniquesUseCase(await techniqueRepository())(query)
}

export async function getTechnique(id: string) {
  return getTechniqueUseCase(await techniqueRepository())(id)
}

export { SERVICE_FAMILIES } from './domain/technique'
export type {
  ServiceFamily,
  TechniqueView,
  TechniqueSnapshot,
} from './domain/technique'
export { TechniqueNotFound } from './domain/errors'
export type { ListTechniquesQuery, Page } from './application/ports'

// UI de administración (US-AGE-08). La compone la ruta src/app/admin/catalog/.
export { AdminCatalogPage } from './ui/AdminCatalogPage'
export { catalogMessages } from './ui/messages'
