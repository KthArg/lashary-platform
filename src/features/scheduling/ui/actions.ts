'use server'

import { revalidatePath } from 'next/cache'
import type { z } from 'zod'
import { isErr, type Result } from '@/shared/result'
import { isStaff } from './require-staff'
import { defineClosedDate, defineManualBlock, defineWeeklyAvailability } from '../application/manage-availability'
import { supabaseSchedulingRepository } from '../db/supabase-scheduling-repository'
import type { SchedulingError } from '../domain/errors'
import { closedDateFormSchema, manualBlockFormSchema, weeklyAvailabilityFormSchema } from './schema'
import { describeSchedulingError, schedulingMessages } from './messages'
import { schedulingRoutes } from './routes'
import type { SchedulingActionState } from './action-state'

async function runAdminFormAction<S extends z.ZodTypeAny>(
  formData: FormData,
  schema: S,
  command: (input: z.output<S>) => Promise<Result<unknown, SchedulingError>>,
  savedMessage: string
): Promise<SchedulingActionState> {
  if (!(await isStaff())) return { status: 'forbidden', message: schedulingMessages.shared.accessDenied }

  const parsed = schema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { status: 'invalid', problems: parsed.error.issues.map((issue) => issue.message) }

  const result = await command(parsed.data)
  if (isErr(result)) return { status: 'invalid', problems: [describeSchedulingError(result.error)] }

  revalidatePath(schedulingRoutes.admin)
  return { status: 'ok', message: savedMessage }
}

export async function defineWeeklyAvailabilityAction(
  _prev: SchedulingActionState,
  formData: FormData
): Promise<SchedulingActionState> {
  return runAdminFormAction(
    formData,
    weeklyAvailabilityFormSchema,
    (input) => defineWeeklyAvailability(supabaseSchedulingRepository, input),
    schedulingMessages.weeklyAvailability.form.saved
  )
}

export async function defineClosedDateAction(
  _prev: SchedulingActionState,
  formData: FormData
): Promise<SchedulingActionState> {
  return runAdminFormAction(
    formData,
    closedDateFormSchema,
    (input) => defineClosedDate(supabaseSchedulingRepository, input),
    schedulingMessages.closedDates.form.saved
  )
}

export async function defineManualBlockAction(
  _prev: SchedulingActionState,
  formData: FormData
): Promise<SchedulingActionState> {
  return runAdminFormAction(
    formData,
    manualBlockFormSchema,
    (input) => defineManualBlock(supabaseSchedulingRepository, input),
    schedulingMessages.manualBlocks.form.saved
  )
}
