import type { InboxView } from '../../../application/inbox'

export type MarkNoticeActionResult = { ok: true } | { ok: false; error: string }

export type AdminInboxResult = { ok: true; inbox: InboxView } | { ok: false }
