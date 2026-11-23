import { randomUUID } from 'node:crypto'
import { ok, err, isErr, type Result } from '@/shared/result'
import { systemClock } from '@/shared/clock'
import { logError } from '@/shared/logger'
import { createSystemClient, closeSystemClient, readSystemClientConfigFromEnv, type SystemClientFailure } from '@/shared/lib/supabase/system'
import {
  listSchedulingAppointmentsForReminders,
  getSchedulingAppointmentForReminder,
  expireSchedulingUndecidedReschedules,
  listSchedulingReapplicationCandidates,
  SCHEDULING_MY_APPOINTMENTS_PATH,
} from '@/features/scheduling'
import { getClientContactForReminders } from '@/features/clients'
import { listTechniquesForReapplication } from '@/features/catalog'
import { confirmationRequestRepository } from './db/confirmation-request-repository'
import { reminderRepository } from './db/reminder-repository'
import { aftercareDeliveryRepository } from './db/aftercare-delivery-repository'
import { clientNoticeDeliveryRepository } from './db/client-notice-delivery-repository'
import { droppedNoticesRepository } from './db/dropped-notices-repository'
import { delinquencyStatesGateway } from './db/delinquency-states-gateway'
import { reapplicationReminderRepository } from './db/reapplication-reminder-repository'
import { reapplicationSettingsRepository } from './db/reapplication-settings-repository'
import { paymentReminderRepository } from './db/payment-reminder-repository'
import { paymentReminderSettingsRepository } from './db/payment-reminder-settings-repository'
import { delinquentClientsGateway } from './db/delinquent-clients-gateway'
import { clientOwedAmountGateway } from './db/client-owed-amount-gateway'
import { runReminderCycle, type RunReminderCycleSummary } from './application/run-reminder-cycle'
import { discoverDueReapplications, type DiscoverDueReapplicationsDeps } from './application/discover-reapplication-reminders'
import { sendDueReapplications, type SendDueReapplicationsSummary } from './application/send-due-reapplications'
import { discoverDuePaymentReminders } from './application/discover-due-payment-reminders'
import { sendDuePaymentReminders, type SendDuePaymentRemindersSummary } from './application/send-due-payment-reminders'
import { buildAppointmentsUrl } from './domain/appointments-url'
import { sendAftercareMessages, type SendAftercareMessagesSummary } from './application/send-aftercare-messages'
import { sendConfirmationRequests, type SendConfirmationRequestsSummary } from './application/send-confirmation-requests'
import type {
  AppointmentSnapshot,
  ContactInfo,
  RepositoryFailure,
  TechniqueReapplicationInfo,
} from './application/ports'
import type { SupabaseClient } from '@supabase/supabase-js'
import { metaWhatsAppChannel, readMetaWhatsAppConfigFromEnv } from './channels/meta-whatsapp-channel'
import { resendEmailChannel, readResendEmailConfigFromEnv } from './channels/resend-email-channel'

const CATALOG_TECHNIQUES_PAGE_SIZE = 100

const REPOSITORY_FAILURE: RepositoryFailure = 'repository-failed'

export type NotificationsCycleError = 'system-client-not-configured' | SystemClientFailure | RepositoryFailure

function buildGetContact(db: SupabaseClient) {
  return async (clientId: string): Promise<Result<ContactInfo | null, RepositoryFailure>> => {
    const result = await getClientContactForReminders(clientId, db)
    return isErr(result) ? err(REPOSITORY_FAILURE) : ok(result.value)
  }
}

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

    const getContact = buildGetContact(db)

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
          logError('notifications', 'NEXT_PUBLIC_SITE_URL no es una URL absoluta: no se mandan confirmaciones sin enlace')
          return err(REPOSITORY_FAILURE)
        }

    const sendAftercare = appointmentsUrl
      ? sendAftercareMessages({
          aftercareMessages: aftercareDeliveryRepository(db),
          getContact,
          primaryChannel,
          backupChannel,
          appointmentsUrl,
          clock: systemClock,
        })
      : async (): Promise<Result<SendAftercareMessagesSummary, RepositoryFailure>> => {
          console.error('[notifications] NEXT_PUBLIC_SITE_URL no es una URL absoluta: no se mandan indicaciones sin enlace')
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
      sendAftercareMessages: sendAftercare,
    })()
  } finally {
    await closeSystemClient(db)
  }
}

export async function buildReapplicationDiscoveryDeps(db: SupabaseClient): Promise<Result<DiscoverDueReapplicationsDeps, RepositoryFailure>> {
  const anticipationDaysResult = await reapplicationSettingsRepository(db).anticipationDays()
  if (isErr(anticipationDaysResult)) {
    logError('notifications', 'no se pudo leer la anticipación configurada, se aborta la corrida', anticipationDaysResult.error)
    return err(REPOSITORY_FAILURE)
  }

  const listCandidates = async () => {
    const result = await listSchedulingReapplicationCandidates(db)
    return isErr(result) ? err(REPOSITORY_FAILURE) : ok(result.value)
  }

  const listTechniquesWithInterval = async (): Promise<Result<ReadonlyMap<string, TechniqueReapplicationInfo>, RepositoryFailure>> => {
    try {
      const result = await listTechniquesForReapplication({ activeOnly: true, pageSize: CATALOG_TECHNIQUES_PAGE_SIZE }, db)
      const withInterval = new Map<string, TechniqueReapplicationInfo>()
      for (const technique of result.items) {
        if (technique.reapplicationIntervalDays !== null) {
          withInterval.set(technique.id, { name: technique.name, intervalDays: technique.reapplicationIntervalDays })
        }
      }
      return ok(withInterval)
    } catch {
      return err(REPOSITORY_FAILURE)
    }
  }

  return ok({
    listCandidates,
    listTechniquesWithInterval,
    statesFor: delinquencyStatesGateway(db).statesFor,
    anticipationDays: anticipationDaysResult.value,
    now: systemClock(),
  })
}

export async function runReapplicationReminderCycle(): Promise<
  Result<SendDueReapplicationsSummary, NotificationsCycleError>
> {
  const systemConfig = readSystemClientConfigFromEnv(process.env)
  if (systemConfig === null) return err('system-client-not-configured')

  const clientResult = await createSystemClient(systemConfig)
  if (isErr(clientResult)) return clientResult
  const db = clientResult.value

  try {
    const depsResult = await buildReapplicationDiscoveryDeps(db)
    if (isErr(depsResult)) return depsResult

    const due = await discoverDueReapplications(depsResult.value)
    if (isErr(due)) return due

    const repo = await reapplicationReminderRepository(db)

    return await sendDueReapplications({
      listRecords: repo.listRecords,
      recordSent: repo.recordSent,
      recordFailed: repo.recordFailed,
      getContact: buildGetContact(db),
      primaryChannel: metaWhatsAppChannel(readMetaWhatsAppConfigFromEnv(process.env)),
      backupChannel: resendEmailChannel(readResendEmailConfigFromEnv(process.env)),
      clock: systemClock,
    })(due.value)
  } finally {
    await closeSystemClient(db)
  }
}

export async function runPaymentReminderCycle(): Promise<Result<SendDuePaymentRemindersSummary, NotificationsCycleError>> {
  const systemConfig = readSystemClientConfigFromEnv(process.env)
  if (systemConfig === null) return err('system-client-not-configured')

  const clientResult = await createSystemClient(systemConfig)
  if (isErr(clientResult)) return clientResult
  const db = clientResult.value

  try {
    const frequencyDays = await paymentReminderSettingsRepository(db).frequencyDays()
    if (isErr(frequencyDays)) {
      logError('notifications', 'no se pudo leer la frecuencia del recordatorio de pago, se aborta la corrida', frequencyDays.error)
      return err(REPOSITORY_FAILURE)
    }

    const reminderLog = await paymentReminderRepository(db)
    const due = await discoverDuePaymentReminders({
      listActiveClientIds: delinquentClientsGateway(db).listActiveClientIds,
      lastSentAt: reminderLog.lastSentAt,
      owedBy: clientOwedAmountGateway(db).owedBy,
      frequencyDays: frequencyDays.value,
      now: systemClock(),
    })
    if (isErr(due)) return due

    return await sendDuePaymentReminders({
      recordSent: reminderLog.recordSent,
      getContact: buildGetContact(db),
      primaryChannel: metaWhatsAppChannel(readMetaWhatsAppConfigFromEnv(process.env)),
      backupChannel: resendEmailChannel(readResendEmailConfigFromEnv(process.env)),
      clock: systemClock,
    })(due.value)
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
export { loadMyAftercare } from './ui/my-aftercare/services/my-aftercare-service'
export { MyAftercare } from './ui/my-aftercare/components/MyAftercare'
export type { MyAftercareResult } from './ui/my-aftercare/services/my-aftercare-service'
export type { AdminInboxResult, MarkNoticeActionResult } from './ui/inbox/types/inbox-results'
export type { InboxView } from './application/inbox'
export type { InboxNotice } from './domain/inbox-notice'
export { AFTERCARE_NOTE_MAX_LENGTH } from './domain/aftercare-message'
export { loadClientAftercareForAdmin } from './ui/client-record-aftercare/services/client-record-aftercare-service'
export { ClientRecordAftercare } from './ui/client-record-aftercare/components/ClientRecordAftercare'
export type { ClientRecordAftercareResult } from './ui/client-record-aftercare/services/client-record-aftercare-service'

export { ReapplicationSettingsPage } from './ui/reapplication-settings/components/ReapplicationSettingsPage'
export { REAPPLICATION_SETTINGS_PATH } from './ui/reapplication-settings/constants/reapplication-settings-strings'
