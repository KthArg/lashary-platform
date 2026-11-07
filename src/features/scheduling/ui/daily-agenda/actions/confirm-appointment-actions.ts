'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { isErr } from '@/shared/result'
import { confirmAppointment } from '@/features/scheduling/application/confirm-appointment'
import { createSupabaseAppointmentConfirmationRepository } from '@/features/scheduling/db/appointment-confirmation-repository'
import { DAILY_AGENDA_PATH, dailyAgendaMessages as COPY } from '../constants/daily-agenda-strings'
import type { ConfirmAppointmentActionResult } from '../types/confirm-appointment-action-results'
import { confirmAppointmentSchema } from '../validation/confirm-appointment-schema'

export async function confirmAppointmentManuallyAction(input: unknown): Promise<ConfirmAppointmentActionResult> {
  await requireAdminSession()

  const parsed = confirmAppointmentSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: COPY.confirmation.invalidRequest }

  const confirmations = createSupabaseAppointmentConfirmationRepository(await createClient())
  const result = await confirmAppointment(confirmations)(parsed.data)
  if (isErr(result)) {
    return {
      ok: false,
      error:
        result.error.code === 'SCHEDULING_APPOINTMENT_NOT_CONFIRMABLE'
          ? COPY.confirmation.notConfirmable
          : COPY.confirmation.failed,
    }
  }

  revalidatePath(DAILY_AGENDA_PATH)
  return { ok: true }
}
