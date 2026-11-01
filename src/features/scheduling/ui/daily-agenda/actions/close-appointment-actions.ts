'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { isErr } from '@/shared/result'
import { closeAppointment } from '@/features/scheduling/application/close-appointment'
import { createSupabaseAppointmentClosingRepository } from '@/features/scheduling/db/appointment-closing-repository'
import { DAILY_AGENDA_PATH } from '../constants/daily-agenda-strings'
import { CLOSE_ERROR_MESSAGES_BY_CODE, closeAppointmentMessages } from '../constants/close-appointment.constants'
import type { CloseAppointmentActionResult } from '../types/close-appointment-action-results'
import { closeAppointmentSchema } from '../validation/close-appointment-schema'

export async function closeAppointmentAction(input: unknown): Promise<CloseAppointmentActionResult> {
  await requireAdminSession()

  const parsed = closeAppointmentSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: closeAppointmentMessages.invalidRequest }

  const closings = createSupabaseAppointmentClosingRepository(await createClient())
  const result = await closeAppointment(closings)(parsed.data)
  if (isErr(result)) return { ok: false, error: CLOSE_ERROR_MESSAGES_BY_CODE[result.error.code] }

  revalidatePath(DAILY_AGENDA_PATH)
  return { ok: true, closing: result.value }
}
