import type { Package } from '@/features/catalog/domain/packages/package'
import { packageToView } from '@/features/catalog/domain/packages/package'
import { packageNameConflict } from '@/features/catalog/domain/packages/errors'
import type {
  PackageRepository,
  PackageWithDuration,
} from '@/features/catalog/application/ports'

// Repositorio en memoria para probar los use-cases sin base de datos. `durationLookup` simula
// el join a catalog_techniques que hace el repositorio real (PERF-005): el fake no conoce
// técnicas, solo el mapeo que el test le da. Sin `class`: fábrica que devuelve un objeto con
// el puerto implementado, más `saveCalls` como propiedad de solo lectura sobre el cierre.
export function createFakePackageRepository(
  initial: Package[] = [],
  durationLookup: (techniqueIds: readonly string[]) => number = () => 0,
): PackageRepository & { readonly saveCalls: number } {
  const store = new Map<string, Package>()
  for (const p of initial) store.set(p.id, p)
  let saveCalls = 0

  const toRow = (pkg: Package): PackageWithDuration => ({
    pkg,
    durationTotalMin: durationLookup(pkg.techniqueIds),
  })

  return {
    get saveCalls() {
      return saveCalls
    },

    async list(params: { activeOnly: boolean; offset: number; limit: number }) {
      let all = [...store.values()]
      if (params.activeOnly) all = all.filter((p) => p.isActive)
      all.sort((a, b) => a.name.localeCompare(b.name))
      return {
        items: all.slice(params.offset, params.offset + params.limit).map(toRow),
        total: all.length,
      }
    },

    async findById(id: string) {
      const pkg = store.get(id)
      return pkg ? toRow(pkg) : null
    },

    async save(pkg: Package) {
      const name = packageToView(pkg).name
      for (const other of store.values()) {
        if (other.id !== pkg.id && packageToView(other).name === name) {
          throw packageNameConflict(name)
        }
      }
      saveCalls += 1
      store.set(pkg.id, pkg)
    },
  }
}
