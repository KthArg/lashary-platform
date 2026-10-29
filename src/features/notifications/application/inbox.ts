import { ok, err, isErr, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { INBOX_LIMIT, type InboxNotice } from '../domain/inbox-notice'
import type { InboxRepository, NoticeNotFound, RepositoryFailure } from './ports'

export type InboxView = {
  notices: InboxNotice[]
  unreadCount: number
}

export type MarkNoticeInput = {
  id: string
  read: boolean
}

export const loadInbox =
  (repository: InboxRepository) =>
  async (): Promise<Result<InboxView, RepositoryFailure>> => {
    const [notices, unreadCount] = await Promise.all([
      repository.listRecent(INBOX_LIMIT),
      repository.countUnread(),
    ])
    if (isErr(notices)) return notices
    if (isErr(unreadCount)) return unreadCount
    return ok({ notices: notices.value, unreadCount: unreadCount.value })
  }

export const markNotice =
  (deps: { repository: InboxRepository; clock: Clock }) =>
  async (input: MarkNoticeInput): Promise<Result<void, RepositoryFailure | NoticeNotFound>> => {
    const readAt = input.read ? deps.clock() : null
    const result = await deps.repository.setReadAt(input.id, readAt)
    if (isErr(result)) return result
    if (!result.value.updated) return err('notice-not-found')
    return ok(undefined)
  }
