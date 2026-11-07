import type { Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { CLIENT_NOTICES_LIMIT, type ClientNotice } from '../domain/client-notice'
import type { ClientNoticesStorageFailed } from '../domain/errors'
import type { ClientNoticesRepository } from './ports'

export const loadClientNotices =
  (deps: { repository: ClientNoticesRepository; clock: Clock }) =>
  (): Promise<Result<ClientNotice[], ClientNoticesStorageFailed>> =>
    deps.repository.listKeptFrom(deps.clock(), CLIENT_NOTICES_LIMIT)
