import { randomUUID } from 'node:crypto'
import { ok, err, isErr, type Result } from '@/shared/result'
import { systemClock } from '@/shared/clock'
import { createSystemClient, closeSystemClient, readSystemClientConfigFromEnv, type SystemClientFailure } from '@/shared/lib/supabase/system'
import { listSchedulingAppointmentsForReminders, getSchedulingAppointmentForReminder } from '@/features/scheduling'
import { getClientContactForReminders } from '@/features/clients'
import { reminderRepository } from './db/reminder-repository'
import { runReminderCycle, type RunReminderCycleSummary } from './application/run-reminder-cycle'
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

    const getContact = async (clientId: string): Promise<Result<ContactInfo | null, RepositoryFailure>> => {
      const result = await getClientContactForReminders(clientId, db)
      return isErr(result) ? err(REPOSITORY_FAILURE) : ok(result.value)
    }

    return await runReminderCycle({
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
      primaryChannel: metaWhatsAppChannel(readMetaWhatsAppConfigFromEnv(process.env)),
      backupChannel: resendEmailChannel(readResendEmailConfigFromEnv(process.env)),
    })()
  } finally {
    await closeSystemClient(db)
  }
}

export type { RunReminderCycleSummary } from './application/run-reminder-cycle'
export { receiveReminderCronRequest } from './http/cron-handler'
