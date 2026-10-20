import { err, ok } from '@/shared/result'
import { techniqueNotAvailable, type StorageFailed } from '../../domain/errors'
import type { SelectableTechnique } from '../../domain/technique-selection'
import type { CatalogPort, ClientHistoryPort } from '../ports'

export function createFakeCatalogPort(techniques: Map<string, SelectableTechnique>): CatalogPort {
  return {
    async findSelectableTechnique(id: string) {
      const technique = techniques.get(id)
      if (!technique) return err(techniqueNotAvailable(id))
      return ok(technique)
    },
  }
}

export type FakeClientHistoryPort = ClientHistoryPort & { calls: string[] }

export function createFakeClientHistoryPort(
  completedTechniqueIds: Set<string> = new Set(),
  failure?: StorageFailed,
): FakeClientHistoryPort {
  const calls: string[] = []
  return {
    calls,
    async hasCompletedAppointment(techniqueId: string) {
      calls.push(techniqueId)
      return failure ? err(failure) : ok(completedTechniqueIds.has(techniqueId))
    },
  }
}
