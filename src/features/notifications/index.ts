import { randomUUID } from 'node:crypto'
import { ok, err, isErr, type Result } from '@/shared/result'
import { systemClock } from '@/shared/clock'
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
import { clientNoticeDeliveryRepository } from './db/client-notice-delivery-repository'
import { droppedNoticesRepository } from './db/dropped-notices-repository'
import { delinquencyStatesGateway } from './db/delinquency-states-gateway'
import { reapplicationReminderRepository } from './db/reapplication-reminder-repository'
import { reapplicationSettingsRepository } from './db/reapplication-settings-repository'
import { runReminderCycle, type RunReminderCycleSummary } from './application/run-reminder-cycle'
import { discoverDueReapplications, type DiscoverDueReapplicationsDeps } from './application/discover-reapplication-reminders'
import { sendDueReapplications, type SendDueReapplicationsSummary } from './application/send-due-reapplications'
import { buildAppointmentsUrl } from './domain/appointments-url'
import { sendConfirmationRequests, type SendConfirmationRequestsSummary } from './application/send-confirmation-requests'
import { REAPPLICATION_ANTICIPATION_DAYS_DEFAULT } from './domain/reapplication-reminder'
import type {
  AppointmentSnapshot,
  ContactInfo,
  DueReapplicationReminder,
  RepositoryFailure,
  TechniqueReapplicationInfo,
} from './application/ports'
import type { SupabaseClient } from '@supabase/supabase-js'
import { metaWhatsAppChannel, readMetaWhatsAppConfigFromEnv } from './channels/meta-whatsapp-channel'
import { resendEmailChannel, readResendEmailConfigFromEnv } from './channels/resend-email-channel'

// Tope de una sola página: el catálogo de técnicas es chico y acotado (boutique de una persona),
// no necesita paginar para este cálculo (PERF-005, una sola consulta).
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

// Compartido por discoverReapplicationReminders y runReapplicationReminderCycle: las tres lecturas
// (scheduling, catalog, delinquency) por el mismo cliente de sistema, más la anticipación
// configurada (criterio 3); si no se puede leer, sigue con el valor por defecto del dominio en vez
// de frenar toda la corrida.
async function buildReapplicationDiscoveryDeps(db: SupabaseClient): Promise<DiscoverDueReapplicationsDeps> {
  const anticipationDaysResult = await reapplicationSettingsRepository(db).anticipationDays()
  if (isErr(anticipationDaysResult)) {
    console.error(
      `[notifications] no se pudo leer la anticipación configurada, se usa el valor por defecto (${REAPPLICATION_ANTICIPATION_DAYS_DEFAULT}): ${anticipationDaysResult.error}`,
    )
  }
  const anticipationDays = isErr(anticipationDaysResult) ? REAPPLICATION_ANTICIPATION_DAYS_DEFAULT : anticipationDaysResult.value

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

  return {
    listCandidates,
    listTechniquesWithInterval,
    statesFor: delinquencyStatesGateway(db).statesFor,
    anticipationDays,
    now: systemClock(),
  }
}

// Solo descubre quién ya debería recibir el aviso de re-aplicación (criterios 1 a 4 de US-NOT-05):
// no escribe en notifications_reapplication_reminders ni envía nada. Sirve para inspección (por
// ejemplo, una corrida en seco); el envío real es runReapplicationReminderCycle.
export async function discoverReapplicationReminders(): Promise<
  Result<DueReapplicationReminder[], NotificationsCycleError>
> {
  const systemConfig = readSystemClientConfigFromEnv(process.env)
  if (systemConfig === null) return err('system-client-not-configured')

  const clientResult = await createSystemClient(systemConfig)
  if (isErr(clientResult)) return clientResult
  const db = clientResult.value

  try {
    return await discoverDueReapplications(await buildReapplicationDiscoveryDeps(db))
  } finally {
    await closeSystemClient(db)
  }
}

// Descubre y manda de una vez, en la misma corrida (criterios 1 a 4 completos de US-NOT-05): a
// diferencia del recordatorio de 24h, no hay un evento futuro que espere — lo que está vencido se
// intenta en el acto. Registra cada intento en notifications_reapplication_reminders (pieza 5/12),
// una vez por ciclo, con reintentos entre corridas hasta MAX_REMINDER_ATTEMPTS.
export async function runReapplicationReminderCycle(): Promise<
  Result<SendDueReapplicationsSummary, NotificationsCycleError>
> {
  const systemConfig = readSystemClientConfigFromEnv(process.env)
  if (systemConfig === null) return err('system-client-not-configured')

  const clientResult = await createSystemClient(systemConfig)
  if (isErr(clientResult)) return clientResult
  const db = clientResult.value

  try {
    const due = await discoverDueReapplications(await buildReapplicationDiscoveryDeps(db))
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

export { ReapplicationSettingsPage } from './ui/reapplication-settings/components/ReapplicationSettingsPage'
export { REAPPLICATION_SETTINGS_PATH } from './ui/reapplication-settings/constants/reapplication-settings-strings'
