import { Technique } from '@/features/catalog/domain/technique'
import type { TechniqueRepository } from '@/features/catalog/application/ports'

// Repositorio en memoria para probar los use-cases sin base de datos.
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
    this.saveCalls += 1
    this.store.set(technique.id, technique)
  }
}
