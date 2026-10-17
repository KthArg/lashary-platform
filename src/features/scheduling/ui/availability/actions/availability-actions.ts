'use server'

import { revalidatePath } from 'next/cache'
import { getAuthSession, isStaffRole } from '@/features/auth'
import { isErr } from '@/shared/result'
import { studioLocalToUtc } from '@/shared/studio-time'
import {
  isAvailabilityEntryNotFound,
  isClosedDateAlreadyExists,
  isManualBlockOverlap,
  isWeeklyBlockOverlap,
} from '../../../domain/availability-errors'
import { schedulingMessages } from '../../messages'
import { availabilityService } from '../services/availability-service'
import {
  closedDateFormSchema,
  manualBlockFormSchema,
  removeFormSchema,
  weeklyBlockFormSchema,
} from '../validation/availability-schema'
import type { AvailabilityActionState } from '../types/availability-action-state'

// Las acciones revisan el rol para dar un mensaje amable; la frontera real es RLS (SEC-001).

const m = schedulingMessages.availability
const AVAILABILITY_PATH = '/admin/citas/disponibilidad'

type ZodIssues = { issues: Array<{ message: string }> }

const forbidden = (): AvailabilityActionState => ({ status: 'forbidden', message: m.accessDenied })
const invalid = (problems: readonly string[]): AvailabilityActionState => ({
  status: 'invalid',
  problems: [...new Set(problems)],
})
const fromZod = (error: ZodIssues) => invalid(error.issues.map((issue) => issue.message))
const done = (message: string): AvailabilityActionState => {
  revalidatePath(AVAILABILITY_PATH)
  return { status: 'ok', message }
}

async function isStaff(): Promise<boolean> {
  const session = await getAuthSession()
  return session !== null && isStaffRole(session.role)
}

const fields = (formData: FormData) => Object.fromEntries(formData)

export async function addWeeklyBlockAction(
  _prev: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  if (!(await isStaff())) return forbidden()
  const parsed = weeklyBlockFormSchema.safeParse(fields(formData))
  if (!parsed.success) return fromZod(parsed.error)

  const result = await availabilityService.addWeeklyBlock({
    weekday: parsed.data.weekday,
    startMin: parsed.data.start,
    endMin: parsed.data.end,
  })
  if (isErr(result)) {
    if (isWeeklyBlockOverlap(result.error)) return { status: 'conflict', message: m.weekly.overlap }
    return invalid([m.validation.startBeforeEnd])
  }
  return done(m.weekly.savedOk)
}

export async function removeWeeklyBlockAction(
  _prev: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  if (!(await isStaff())) return forbidden()
  const parsed = removeFormSchema.safeParse(fields(formData))
  if (!parsed.success) return { status: 'conflict', message: m.notFound }

  const result = await availabilityService.removeWeeklyBlock(parsed.data.id)
  if (isErr(result) && isAvailabilityEntryNotFound(result.error)) {
    return { status: 'conflict', message: m.notFound }
  }
  return done(m.weekly.removedOk)
}

export async function addClosedDateAction(
  _prev: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  if (!(await isStaff())) return forbidden()
  const parsed = closedDateFormSchema.safeParse(fields(formData))
  if (!parsed.success) return fromZod(parsed.error)

  const result = await availabilityService.addClosedDate(parsed.data)
  if (isErr(result)) {
    if (isClosedDateAlreadyExists(result.error)) return { status: 'conflict', message: m.closed.alreadyClosed }
    return invalid([m.validation.date])
  }
  return done(m.closed.savedOk)
}

export async function removeClosedDateAction(
  _prev: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  if (!(await isStaff())) return forbidden()
  const parsed = removeFormSchema.safeParse(fields(formData))
  if (!parsed.success) return { status: 'conflict', message: m.notFound }

  const result = await availabilityService.removeClosedDate(parsed.data.id)
  if (isErr(result) && isAvailabilityEntryNotFound(result.error)) {
    return { status: 'conflict', message: m.notFound }
  }
  return done(m.closed.removedOk)
}

// La fecha y las horas llegan en hora del estudio y se guardan en UTC (DOM-003).
export async function addManualBlockAction(
  _prev: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  if (!(await isStaff())) return forbidden()
  const parsed = manualBlockFormSchema.safeParse(fields(formData))
  if (!parsed.success) return fromZod(parsed.error)

  const { date, start, end, reason } = parsed.data
  const result = await availabilityService.addManualBlock({
    startsAt: studioLocalToUtc(date, start),
    endsAt: studioLocalToUtc(date, end),
    reason,
  })
  if (isErr(result)) {
    if (isManualBlockOverlap(result.error)) return { status: 'conflict', message: m.blocks.overlap }
    return invalid([m.validation.startBeforeEnd])
  }
  return done(m.blocks.savedOk)
}
