import { err, type Result } from '@/shared/result'
import { isValidAnticipationDays } from '../domain/reapplication-reminder'
import { invalidAnticipationDays } from '../domain/errors'
import type { ChangeAnticipationDaysFailure, ReapplicationSettingsRepository, RepositoryFailure } from './ports'

export const loadAnticipationDays =
  (repository: ReapplicationSettingsRepository) => (): Promise<Result<number, RepositoryFailure>> =>
    repository.anticipationDays()

// Un valor fuera de rango ni siquiera llega a la base: se rechaza aquí. La base lo vuelve a exigir.
export const changeAnticipationDays =
  (repository: ReapplicationSettingsRepository) =>
  async (days: number): Promise<Result<number, ChangeAnticipationDaysFailure>> => {
    if (!isValidAnticipationDays(days)) return err(invalidAnticipationDays())
    return repository.setAnticipationDays(days)
  }
