'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { formatStudioDateTime } from '@/shared/studio-time'
import { isUnread, type InboxNotice } from '@/features/notifications/domain/inbox-notice'
import { loadMoreNoticesAction, markNoticeAction } from '@/features/notifications/ui/inbox/actions/inbox-actions'
import { INBOX_TEXTS } from '@/features/notifications/ui/inbox/constants/inbox-strings'
import { adminInboxStyles as STYLES } from './AdminInbox.styles'
import type { AdminInboxProps } from './AdminInbox.types'

const TITLE_ID = 'admin-inbox-title'

export function AdminInbox({ inbox }: AdminInboxProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const router = useRouter()
  const [isSaving, startSaving] = useTransition()
  const [isLoadingMore, startLoadingMore] = useTransition()
  const [actionError, setActionError] = useState<string | null>(null)
  const [extraNotices, setExtraNotices] = useState<InboxNotice[]>([])
  const [extraHasMore, setExtraHasMore] = useState<boolean | null>(null)

  const unreadCount = inbox.ok ? inbox.inbox.unreadCount : 0
  const firstPage = inbox.ok ? inbox.inbox.notices : []
  const notices = [...firstPage, ...extraNotices.filter((extra) => !firstPage.some((notice) => notice.id === extra.id))]
  const hasMore = inbox.ok && (extraHasMore ?? inbox.inbox.hasMore)

  const resetPanel = () => {
    setExtraNotices([])
    setExtraHasMore(null)
    setActionError(null)
  }

  const loadMore = () => {
    setActionError(null)
    startLoadingMore(async () => {
      const result = await loadMoreNoticesAction({ offset: notices.length })
      if (!result.ok) {
        setActionError(result.error)
        return
      }
      setExtraNotices((current) => [...current, ...result.page.notices])
      setExtraHasMore(result.page.hasMore)
    })
  }

  const changeRead = (id: string, read: boolean) => {
    setActionError(null)
    startSaving(async () => {
      const result = await markNoticeAction({ id, read })
      if (!result.ok) {
        setActionError(result.error)
        return
      }
      setExtraNotices((current) =>
        current.map((notice) => (notice.id === id ? { ...notice, readAt: read ? new Date() : null } : notice)),
      )
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={STYLES.trigger}
        aria-haspopup="dialog"
        aria-label={INBOX_TEXTS.triggerLabel(unreadCount)}
        title={INBOX_TEXTS.title}
      >
        <svg className={STYLES.triggerIcon} fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.4-1.4A2 2 0 0118 14.2V11a6 6 0 00-4-5.7V5a2 2 0 10-4 0v.3A6 6 0 006 11v3.2a2 2 0 01-.6 1.4L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        <span className={STYLES.triggerText}>{INBOX_TEXTS.title}</span>
        {unreadCount > 0 && <span className={STYLES.badge}>{unreadCount}</span>}
      </button>

      <dialog ref={dialogRef} aria-labelledby={TITLE_ID} className={STYLES.panel} onClose={resetPanel}>
        <div className={STYLES.header}>
          <h2 id={TITLE_ID} className={STYLES.title}>{INBOX_TEXTS.title}</h2>
          <button type="button" onClick={() => dialogRef.current?.close()} className={STYLES.close}>
            {INBOX_TEXTS.close}
          </button>
        </div>

        {actionError && <p role="alert" className={STYLES.actionError}>{actionError}</p>}

        {!inbox.ok ? (
          <div role="alert" className={STYLES.state}>
            <p>{INBOX_TEXTS.loadFailed}</p>
            <button type="button" onClick={() => router.refresh()} className={STYLES.retry}>
              {INBOX_TEXTS.retry}
            </button>
          </div>
        ) : notices.length === 0 ? (
          <p className={STYLES.state}>{INBOX_TEXTS.empty}</p>
        ) : (
          <>
            <ul className={STYLES.list} aria-busy={isSaving || isLoadingMore}>
              {notices.map((notice) => {
                const unread = isUnread(notice)
                return (
                  <li key={notice.id} className={unread ? STYLES.itemUnread : STYLES.itemRead}>
                    <p className={STYLES.itemTitle}>
                      {unread && <span className={STYLES.dot} aria-hidden="true" />}
                      {unread && <span className={STYLES.srOnly}>{INBOX_TEXTS.unread}</span>}
                      {INBOX_TEXTS.bookingCreated(notice.clientName)}
                    </p>
                    <p className={STYLES.itemDetail}>{notice.serviceName}</p>
                    <p className={STYLES.itemDetail}>{formatStudioDateTime(notice.startsAt)}</p>
                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => changeRead(notice.id, unread)}
                      className={STYLES.markButton}
                    >
                      {unread ? INBOX_TEXTS.markRead : INBOX_TEXTS.markUnread}
                    </button>
                  </li>
                )
              })}
            </ul>
            {hasMore && (
              <button type="button" onClick={loadMore} disabled={isLoadingMore} className={STYLES.loadMore}>
                {isLoadingMore ? INBOX_TEXTS.loadingMore : INBOX_TEXTS.loadMore}
              </button>
            )}
          </>
        )}
      </dialog>
    </>
  )
}
