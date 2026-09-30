'use server'

import { revalidatePath } from 'next/cache'
import { isErr } from '@/shared/result'
import { isStaff } from './require-staff'
import { defineClosedDate, defineManualBlock, defineWeeklyAvailability } from '../application/manage-availability'
import { supabaseSchedulingRepository } from '../db/supabase-scheduling-repository'
import { closedDateFormSchema, manualBlockFormSchema, weeklyAvailabilityFormSchema } from './schema'
import { parseCostaRicaLocalDateTime } from './parse-local-datetime'
import { schedulingMessages } from './messages'
import { schedulingRoutes } from './routes'
import type { SchedulingActionState } from './action-state'

function forbidden(): SchedulingActionState {
  return { status: 'forbidden', message: schedulingMessages.shared.accessDenied }
}

export async function defineWeeklyAvailabilityAction(
  _prev: SchedulingActionState,
  formData: FormData
): Promise<SchedulingActionState> {
  if (!(await isStaff())) return forbidden()

  const parsed = weeklyAvailabilityFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { status: 'invalid', problems: parsed.error.issues.map((issue: { message: string }) => issue.message) }
  }

  const result = await defineWeeklyAvailability(supabaseSchedulingRepository, parsed.data)
  if (isErr(result)) return { status: 'invalid', problems: [result.error.message] }

  revalidatePath(schedulingRoutes.admin)
  return { status: 'ok', message: schedulingMessages.weeklyAvailability.form.saved }
}

export async function defineClosedDateAction(
  _prev: SchedulingActionState,
  formData: FormData
): Promise<SchedulingActionState> {
  if (!(await isStaff())) return forbidden()

  const parsed = closedDateFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { status: 'invalid', problems: parsed.error.issues.map((issue: { message: string }) => issue.message) }
  }

  const result = await defineClosedDate(supabaseSchedulingRepository, parsed.data)
  if (isErr(result)) return { status: 'invalid', problems: [result.error.message] }

  revalidatePath(schedulingRoutes.admin)
  return { status: 'ok', message: schedulingMessages.closedDates.form.saved }
}

export async function defineManualBlockAction(
  _prev: SchedulingActionState,
  formData: FormData
): Promise<SchedulingActionState> {
  if (!(await isStaff())) return forbidden()

  const parsed = manualBlockFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return { status: 'invalid', problems: parsed.error.issues.map((issue: { message: string }) => issue.message) }
  }

  const result = await defineManualBlock(supabaseSchedulingRepository, {
    resourceId: parsed.data.resourceId,
    startsAt: parseCostaRicaLocalDateTime(parsed.data.startsAt),
    endsAt: parseCostaRicaLocalDateTime(parsed.data.endsAt),
    reason: parsed.data.reason,
  })
  if (isErr(result)) return { status: 'invalid', problems: [result.error.message] }

  revalidatePath(schedulingRoutes.admin)
  return { status: 'ok', message: schedulingMessages.manualBlocks.form.saved }
}
