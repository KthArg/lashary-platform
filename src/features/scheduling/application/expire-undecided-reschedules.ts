import type { Result } from '@/shared/result'
import type { StorageFailed } from '../domain/errors'
import type { RescheduleExpiryRepository } from './ports'

export async function expireUndecidedReschedules(
  repo: RescheduleExpiryRepository,
): Promise<Result<number, StorageFailed>> {
  return repo.expireUndecided()
}
