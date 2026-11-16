import { moneyFromColones, formatMoney } from '@/shared/money'
import { formatStudioDateTime } from '@/shared/studio-time'
import { lostDeposit, type InboxNotice } from '@/features/notifications/domain/inbox-notice'
import { DELINQUENCY_REVIEW_PATH, INBOX_TEXTS } from '../constants/inbox-strings'

export type NoticeAction = { label: string; href: string }
export type NoticeLines = { title: string; details: string[]; action?: NoticeAction }

export function noticeLines(notice: InboxNotice): NoticeLines {
  switch (notice.kind) {
    case 'booking_created':
      return {
        title: INBOX_TEXTS.bookingCreated(notice.clientName),
        details: [notice.serviceName, formatStudioDateTime(notice.startsAt)],
      }
    case 'appointment_cancelled':
      return {
        title: INBOX_TEXTS.appointmentCancelled(notice.clientName),
        details: [
          notice.serviceName,
          formatStudioDateTime(notice.startsAt),
          lostDeposit(notice)
            ? INBOX_TEXTS.depositForfeited(formatMoney(moneyFromColones(notice.forfeitedDeposit)))
            : INBOX_TEXTS.depositKept,
        ],
      }
    case 'appointment_rescheduled':
      return {
        title: INBOX_TEXTS.appointmentRescheduled(notice.clientName),
        details: [
          notice.serviceName,
          INBOX_TEXTS.previousSchedule(formatStudioDateTime(notice.previousStartsAt)),
          INBOX_TEXTS.newSchedule(formatStudioDateTime(notice.startsAt)),
        ],
      }
    case 'delinquency_review':
      return {
        title: INBOX_TEXTS.delinquencyReview(notice.clientName),
        details: [INBOX_TEXTS.owes(formatMoney(moneyFromColones(notice.pending)))],
        action: { label: INBOX_TEXTS.reviewDelinquencies, href: DELINQUENCY_REVIEW_PATH },
      }
  }
}
