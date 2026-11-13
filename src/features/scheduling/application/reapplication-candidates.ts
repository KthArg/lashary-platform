import type { Result } from '@/shared/result'
import type { StorageFailed } from '../domain/errors'
import type { ReapplicationCandidate, ReapplicationCandidatesRepository } from './ports'

export async function listReapplicationCandidates(
  repo: ReapplicationCandidatesRepository,
): Promise<Result<ReapplicationCandidate[], StorageFailed>> {
  return repo.listCandidates()
}
