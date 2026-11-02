import type { InboxView } from '@/features/notifications/application/inbox'
import type { InboxPage } from '@/features/notifications/application/ports'

export type MarkNoticeActionResult = { ok: true } | { ok: false; error: string }

export type LoadMoreNoticesResult = { ok: true; page: InboxPage } | { ok: false; error: string }

export type AdminInboxResult = { ok: true; inbox: InboxView } | { ok: false }
