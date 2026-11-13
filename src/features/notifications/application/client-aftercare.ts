import type { Result } from '@/shared/result'
import { MY_AFTERCARE_PAGE_SIZE, type ClientAftercare } from '../domain/aftercare-message'
import type { AftercareStorageFailed } from '../domain/errors'
import type { ClientAftercareRepository } from './ports'

export const loadClientAftercare =
  (deps: { repository: ClientAftercareRepository }) =>
  (): Promise<Result<ClientAftercare[], AftercareStorageFailed>> =>
    deps.repository.listRecent(MY_AFTERCARE_PAGE_SIZE)
