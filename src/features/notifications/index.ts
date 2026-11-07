import { randomUUID } from 'node:crypto'
import { ok, err, isErr, type Result } from '@/shared/result'
import { systemClock } from '@/shared/clock'
import { createSystemClient, closeSystemClient, readSystemClientConfigFromEnv, type SystemClientFailure } from '@/shared/lib/supabase/system'
import {
  listSchedulingAppointmentsForReminders,
  getSchedulingAppointmentForReminder,
  expireSchedulingUndecidedReschedules,
  SCHEDULING_MY_APPOINTMENTS_PATH,
} from '@/features/scheduling'
import { getClientContactForReminders } from '@/features/clients'
import { confirmationRequestRepository } from './db/confirmation-request-repository'
import { reminderRepository } from './db/reminder-repository'
import { clientNoticeDeliveryRepository } from './db/client-notice-delivery-repository'
import { droppedNoticesRepository } from './db/dropped-notices-repository'
import { runReminderCycle, type RunReminderCycleSummary } from './application/run-reminder-cycle'
import { buildAppointmentsUrl } from './domain/appointments-url'
import { sendConfirmationRequests, type SendConfirmationRequestsSummary } from './application/send-confirmation-requests'
import type { AppointmentSnapshot, ContactInfo, RepositoryFailure } from './application/ports'
import { metaWhatsAppChannel, readMetaWhatsAppConfigFromEnv } from './channels/meta-whatsapp-channel'
import { resendEmailChannel, readResendEmailConfigFromEnv } from './channels/resend-email-channel'

const REPOSITORY_FAILURE: RepositoryFailure = 'repository-failed'

export type NotificationsCycleError = 'system-client-not-configured' | SystemClientFailure | RepositoryFailure

export async function runNotificationsReminderCycle(): Promise<
  Result<RunReminderCycleSummary, NotificationsCycleError>
> {
  const systemConfig = readSystemClientConfigFromEnv(process.env)
  if (systemConfig === null) return err('system-client-not-configured')

  const clientResult = await createSystemClient(systemConfig)
  if (isErr(clientResult)) return clientResult
  const db = clientResult.value

  try {
    const repo = await reminderRepository(db)

    const listUpcoming = async (window: { from: Date; to: Date }): Promise<Result<AppointmentSnapshot[], RepositoryFailure>> => {
      const result = await listSchedulingAppointmentsForReminders(window, db)
      return isErr(result) ? err(REPOSITORY_FAILURE) : ok(result.value)
    }

    const getAppointmentSnapshot = async (appointmentId: string): Promise<Result<AppointmentSnapshot | null, RepositoryFailure>> => {
      const result = await getSchedulingAppointmentForReminder(appointmentId, db)
      return isErr(result) ? err(REPOSITORY_FAILURE) : ok(result.value)
    }

    const expireUndecidedReschedules = async (): Promise<Result<number, RepositoryFailure>> => {
      const result = await expireSchedulingUndecidedReschedules(db)
      return isErr(result) ? err(REPOSITORY_FAILURE) : ok(result.value)
    }

    const getContact = async (clientId: string): Promise<Result<ContactInfo | null, RepositoryFailure>> => {
      const result = await getClientContactForReminders(clientId, db)
      return isErr(result) ? err(REPOSITORY_FAILURE) : ok(result.value)
    }

    const primaryChannel = metaWhatsAppChannel(readMetaWhatsAppConfigFromEnv(process.env))
    const backupChannel = resendEmailChannel(readResendEmailConfigFromEnv(process.env))

    const appointmentsUrl = buildAppointmentsUrl(process.env.NEXT_PUBLIC_SITE_URL, SCHEDULING_MY_APPOINTMENTS_PATH)
    const sendConfirmations = appointmentsUrl
      ? sendConfirmationRequests({
          requests: confirmationRequestRepository(db),
          getContact,
          primaryChannel,
          backupChannel,
          appointmentsUrl,
          clock: systemClock,
        })
      : async (): Promise<Result<SendConfirmationRequestsSummary, RepositoryFailure>> => {
          console.error('[notifications] NEXT_PUBLIC_SITE_URL no es una URL absoluta: no se mandan confirmaciones sin enlace')
          return err(REPOSITORY_FAILURE)
        }

    return await runReminderCycle({
      expireUndecidedReschedules,
      listUpcoming,
      insertIfAbsent: repo.insertIfAbsent,
      newId: () => randomUUID(),
      clock: systemClock,
      releaseExpiredClaims: repo.releaseExpiredClaims,
      listPending: repo.listPending,
      getAppointmentSnapshot,
      reschedulePending: repo.reschedulePending,
      cancelPending: repo.cancelPending,
      claimDuePending: repo.claimDuePending,
      releaseToPending: repo.releaseToPending,
      getContact,
      markSent: repo.markSent,
      markRetry: repo.markRetry,
      markExhausted: repo.markExhausted,
      clientNotices: clientNoticeDeliveryRepository(db),
      droppedNotices: droppedNoticesRepository(db),
      recordAttempt: repo.recordAttempt,
      primaryChannel,
      backupChannel,
      sendConfirmationRequests: sendConfirmations,
    })()
  } finally {
    await closeSystemClient(db)
  }
}

export type { RunReminderCycleSummary } from './application/run-reminder-cycle'
export { receiveReminderCronRequest } from './http/cron-handler'
export { loadAdminInbox } from './ui/inbox/services/inbox-service'
export { markNoticeAction } from './ui/inbox/actions/inbox-actions'
export { AdminInbox } from './ui/inbox/components/AdminInbox'
export { loadMyClientNotices } from './ui/client-notices/services/client-notices-service'
export { ClientNotices } from './ui/client-notices/components/ClientNotices'
export type { ClientNoticesResult } from './ui/client-notices/services/client-notices-service'
export type { AdminInboxResult, MarkNoticeActionResult } from './ui/inbox/types/inbox-results'
export type { InboxView } from './application/inbox'
export type { InboxNotice } from './domain/inbox-notice'
