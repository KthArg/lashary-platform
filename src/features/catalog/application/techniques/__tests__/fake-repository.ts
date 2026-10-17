import { ok, err } from '@/shared/result'
import type { Technique } from '@/features/catalog/domain/techniques/technique'
import { techniqueNameConflict } from '@/features/catalog/domain/techniques/errors'
import type { TechniqueRepository } from '@/features/catalog/application/techniques/ports'

export type FakeTechniqueRepository = TechniqueRepository & { readonly saveCalls: number }

export function createFakeTechniqueRepository(initial: Technique[] = []): FakeTechniqueRepository {
  const store = new Map<string, Technique>()
  for (const technique of initial) store.set(technique.id, technique)
  let saveCalls = 0

  return {
    get saveCalls() {
      return saveCalls
    },

    async list(params: { activeOnly: boolean; offset: number; limit: number }) {
      let all = [...store.values()]
      if (params.activeOnly) all = all.filter((technique) => technique.isActive)
      all.sort(
        (first, second) =>
          first.family.localeCompare(second.family) || first.name.localeCompare(second.name),
      )
      return {
        items: all.slice(params.offset, params.offset + params.limit),
        total: all.length,
      }
    },

    async findById(id: string) {
      return store.get(id) ?? null
    },

    async findByIds(ids: string[]) {
      return ids
        .map((id) => store.get(id))
        .filter((technique): technique is Technique => technique !== undefined)
    },

    async save(technique: Technique) {
      for (const other of store.values()) {
        if (other.id !== technique.id && other.name === technique.name) {
          return err(techniqueNameConflict(technique.name))
        }
      }
      saveCalls += 1
      store.set(technique.id, technique)
      return ok(undefined)
    },
  }
}
