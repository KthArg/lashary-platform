import { Technique } from '@/features/catalog/domain/technique'
import { TechniqueNameConflict } from '@/features/catalog/domain/errors'
import type { TechniqueRepository } from '@/features/catalog/application/ports'

// Repositorio en memoria para probar los use-cases sin base de datos. Simula la constraint
// catalog_techniques_name_unique (DOM-006): dos técnicas con distinto id no pueden compartir
// nombre, igual que en Postgres.
export class FakeTechniqueRepository implements TechniqueRepository {
  private readonly store = new Map<string, Technique>()
  saveCalls = 0

  constructor(initial: Technique[] = []) {
    for (const t of initial) this.store.set(t.id, t)
  }

  async list(params: { activeOnly: boolean; offset: number; limit: number }) {
    let all = [...this.store.values()]
    if (params.activeOnly) all = all.filter((t) => t.isActive)
    all.sort(
      (a, b) => a.family.localeCompare(b.family) || a.name.localeCompare(b.name),
    )
    return {
      items: all.slice(params.offset, params.offset + params.limit),
      total: all.length,
    }
  }

  async findById(id: string) {
    return this.store.get(id) ?? null
  }

  async save(technique: Technique) {
    const name = technique.toView().name
    for (const other of this.store.values()) {
      if (other.id !== technique.id && other.toView().name === name) {
        throw new TechniqueNameConflict(name)
      }
    }
    this.saveCalls += 1
    this.store.set(technique.id, technique)
  }
}
