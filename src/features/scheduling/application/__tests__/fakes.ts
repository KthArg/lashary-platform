import { err, ok } from '@/shared/result'
import { techniqueNotAvailable } from '../../domain/errors'
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

export type FakeClientHistoryPort = ClientHistoryPort & {
  calls: Array<{ clientId: string; techniqueId: string }>
}

export function createFakeClientHistoryPort(completed: Set<string> = new Set()): FakeClientHistoryPort {
  const calls: Array<{ clientId: string; techniqueId: string }> = []
  return {
    calls,
    async hasCompletedAppointment(clientId: string, techniqueId: string) {
      calls.push({ clientId, techniqueId })
      return completed.has(`${clientId}:${techniqueId}`)
    },
  }
}
