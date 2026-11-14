import { isErr, ok, type Result } from '@/shared/result'
import { computeReapplicationDueDate, isReapplicationDue } from '../domain/reapplication-reminder'
import type {
  DelinquencyStatesPort,
  DueReapplicationReminder,
  ReapplicationCandidatesPort,
  RepositoryFailure,
  TechniqueReapplicationPort,
} from './ports'

export type DiscoverDueReapplicationsDeps = {
  listCandidates: ReapplicationCandidatesPort['listCandidates']
  listTechniquesWithInterval: TechniqueReapplicationPort['listTechniquesWithInterval']
  statesFor: DelinquencyStatesPort['statesFor']
  anticipationDays: number
  now: Date
}

// Criterio 4 (DOM-012): solo la morosidad 'active' bloquea el aviso — 'pending_review' todavía no
// tiene ninguna consecuencia (docs/contracts/delinquency-api.md).
const BLOCKING_DELINQUENCY_STATE = 'active'

export async function discoverDueReapplications(
  deps: DiscoverDueReapplicationsDeps,
): Promise<Result<DueReapplicationReminder[], RepositoryFailure>> {
  const candidatesResult = await deps.listCandidates()
  if (isErr(candidatesResult)) return candidatesResult

  const techniquesResult = await deps.listTechniquesWithInterval()
  if (isErr(techniquesResult)) return techniquesResult

  const clientIds = [...new Set(candidatesResult.value.map((candidate) => candidate.clientId))]
  const statesResult = await deps.statesFor(clientIds)
  if (isErr(statesResult)) return statesResult

  const techniques = techniquesResult.value
  const states = statesResult.value

  const due: DueReapplicationReminder[] = []
  for (const candidate of candidatesResult.value) {
    if (states.get(candidate.clientId) === BLOCKING_DELINQUENCY_STATE) continue

    const technique = techniques.get(candidate.techniqueId)
    if (technique === undefined) continue

    const dueAt = computeReapplicationDueDate(candidate.lastCompletedAt, technique.intervalDays)
    if (!isReapplicationDue(dueAt, deps.anticipationDays, deps.now)) continue

    due.push({
      clientId: candidate.clientId,
      techniqueId: candidate.techniqueId,
      techniqueName: technique.name,
      lastCompletedAt: candidate.lastCompletedAt,
      dueAt,
    })
  }

  return ok(due)
}
