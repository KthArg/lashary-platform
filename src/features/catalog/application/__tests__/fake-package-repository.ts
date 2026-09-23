import { Package } from '@/features/catalog/domain/package'
import { PackageNameConflict } from '@/features/catalog/domain/errors'
import type {
  PackageRepository,
  PackageWithDuration,
} from '@/features/catalog/application/ports'

// Repositorio en memoria para probar los use-cases sin base de datos. `durationLookup` simula
// el join a catalog_techniques que hace el repositorio real (PERF-005): el fake no conoce
// técnicas, solo el mapeo que el test le da.
export class FakePackageRepository implements PackageRepository {
  private readonly store = new Map<string, Package>()
  private readonly durationLookup: (techniqueIds: string[]) => number
  saveCalls = 0

  constructor(
    initial: Package[] = [],
    durationLookup: (techniqueIds: string[]) => number = () => 0,
  ) {
    this.durationLookup = durationLookup
    for (const p of initial) this.store.set(p.id, p)
  }

  private toRow(pkg: Package): PackageWithDuration {
    return { pkg, durationTotalMin: this.durationLookup(pkg.techniqueIds) }
  }

  async list(params: { activeOnly: boolean; offset: number; limit: number }) {
    let all = [...this.store.values()]
    if (params.activeOnly) all = all.filter((p) => p.isActive)
    all.sort((a, b) => a.name.localeCompare(b.name))
    return {
      items: all.slice(params.offset, params.offset + params.limit).map((p) => this.toRow(p)),
      total: all.length,
    }
  }

  async findById(id: string) {
    const pkg = this.store.get(id)
    return pkg ? this.toRow(pkg) : null
  }

  async save(pkg: Package) {
    const name = pkg.toView().name
    for (const other of this.store.values()) {
      if (other.id !== pkg.id && other.toView().name === name) {
        throw new PackageNameConflict(name)
      }
    }
    this.saveCalls += 1
    this.store.set(pkg.id, pkg)
  }
}
