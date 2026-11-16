import { err, type Result } from '@/shared/result'
import { isValidGraceDays } from '../domain/grace-days'
import { invalidGraceDays, type DelinquencyStorageFailed } from '../domain/errors'
import type { ChangeGraceDaysFailure, SettingsRepository } from './ports'

export const loadGraceDays =
  (repository: SettingsRepository) => (): Promise<Result<number, DelinquencyStorageFailed>> =>
    repository.graceDays()

// Un valor fuera de rango ni siquiera llega a la base: se rechaza aquí. La base lo vuelve a exigir.
export const changeGraceDays =
  (repository: SettingsRepository) =>
  async (days: number): Promise<Result<number, ChangeGraceDaysFailure>> => {
    if (!isValidGraceDays(days)) return err(invalidGraceDays())
    return repository.setGraceDays(days)
  }
