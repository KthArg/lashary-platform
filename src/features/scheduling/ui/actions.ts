'use server'

import { revalidatePath } from 'next/cache'
import { isStaff } from './require-staff'
import { defineClosedDate, defineManualBlock, defineWeeklyAvailability } from '../application/manage-availability'
import { supabaseSchedulingRepository } from '../db/supabase-scheduling-repository'
import { SchedulingError } from '../domain/errors'
import { closedDateFormSchema, manualBlockFormSchema, weeklyAvailabilityFormSchema } from './schema'
import { parseCostaRicaLocalDateTime } from './parse-local-datetime'
import { schedulingMessages } from './messages'
import { schedulingRoutes } from './routes'
import type { SchedulingActionState } from './action-state'

function forbidden(): SchedulingActionState {
  return { status: 'forbidden', message: schedulingMessages.shared.accessDenied }
}

// El dominio lanza SchedulingError (no Result) en sus constructores — ver domain/availability.ts.
// Cada action lo atrapa acá, el único lugar donde se mapea a mensaje de formulario (DOM-006).
async function runOrReportError(run: () => Promise<void>): Promise<SchedulingActionState> {
  try {
    await run()
  } catch (error) {
    if (error instanceof SchedulingError) return { status: 'invalid', problems: [error.message] }
    throw error
  }
  revalidatePath(schedulingRoutes.admin)
  return { status: 'idle' }
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

  const result = await runOrReportError(async () => {
    await defineWeeklyAvailability(supabaseSchedulingRepository, parsed.data)
  })
  if (result.status === 'invalid') return result
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

  const result = await runOrReportError(async () => {
    await defineClosedDate(supabaseSchedulingRepository, parsed.data)
  })
  if (result.status === 'invalid') return result
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

  const result = await runOrReportError(async () => {
    await defineManualBlock(supabaseSchedulingRepository, {
      resourceId: parsed.data.resourceId,
      startsAt: parseCostaRicaLocalDateTime(parsed.data.startsAt),
      endsAt: parseCostaRicaLocalDateTime(parsed.data.endsAt),
      reason: parsed.data.reason,
    })
  })
  if (result.status === 'invalid') return result
  return { status: 'ok', message: schedulingMessages.manualBlocks.form.saved }
}
