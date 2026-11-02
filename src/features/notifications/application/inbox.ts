import { ok, err, isErr, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import { INBOX_LIMIT } from '../domain/inbox-notice'
import type { InboxStorageFailed } from '../domain/errors'
import type { InboxPage, InboxRepository, NoticeNotFound } from './ports'

export type InboxView = InboxPage & {
  unreadCount: number
}

export type MarkNoticeInput = {
  id: string
  read: boolean
}

export const loadInbox =
  (repository: InboxRepository) =>
  async (): Promise<Result<InboxView, InboxStorageFailed>> => {
    const [firstPage, unreadCount] = await Promise.all([
      repository.listRecent({ offset: 0, limit: INBOX_LIMIT }),
      repository.countUnread(),
    ])
    if (isErr(firstPage)) return firstPage
    if (isErr(unreadCount)) return unreadCount
    return ok({ ...firstPage.value, unreadCount: unreadCount.value })
  }

export const loadMoreNotices =
  (repository: InboxRepository) =>
  (offset: number): Promise<Result<InboxPage, InboxStorageFailed>> =>
    repository.listRecent({ offset, limit: INBOX_LIMIT })

export const markNotice =
  (deps: { repository: InboxRepository; clock: Clock }) =>
  async (input: MarkNoticeInput): Promise<Result<void, InboxStorageFailed | NoticeNotFound>> => {
    const readAt = input.read ? deps.clock() : null
    const result = await deps.repository.setReadAt(input.id, readAt)
    if (isErr(result)) return result
    if (!result.value.updated) return err('notice-not-found')
    return ok(undefined)
  }
