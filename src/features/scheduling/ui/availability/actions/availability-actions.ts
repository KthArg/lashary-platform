'use server'

import { revalidatePath } from 'next/cache'
import { getAuthSession, isStaffRole } from '@/features/auth'
import { isErr } from '@/shared/result'
import { studioLocalToUtc } from '@/shared/studio-time'
import {
  isAvailabilityEntryNotFound,
  isClosedDateAlreadyExists,
  isManualBlockHasAppointment,
  isManualBlockNotBlocked,
  isManualBlockOverlap,
  isWeeklyBlockOverlap,
} from '../../../domain/availability-errors'
import { schedulingMessages } from '../../messages'
import { availabilityService } from '../services/availability-service'
import { confirmationNeeded } from '../utils/confirm-reduction'
import {
  blockSlotsFormSchema,
  closedDateFormSchema,
  manualBlockFormSchema,
  releaseSlotsFormSchema,
  removeFormSchema,
  weeklyBlockFormSchema,
} from '../validation/availability-schema'
import type { AvailabilityActionState } from '../types/availability-action-state'
import { APPOINTMENTS_PATH, AVAILABILITY_PATH, BLOCK_SLOTS_FIELDS } from '../constants/availability.constants'

// Las acciones revisan el rol para dar un mensaje amable; la frontera real es RLS (SEC-001).

const availabilityMessages = schedulingMessages.availability

type ZodIssues = { issues: Array<{ message: string }> }

const forbidden = (): AvailabilityActionState => ({ status: 'forbidden', message: availabilityMessages.accessDenied })
const invalid = (problems: readonly string[]): AvailabilityActionState => ({
  status: 'invalid',
  problems: [...new Set(problems)],
})
const fromZod = (error: ZodIssues) => invalid(error.issues.map((issue) => issue.message))
const resolveAppointmentFirst = (message: string): AvailabilityActionState => ({
  status: 'conflict',
  message,
  link: { href: APPOINTMENTS_PATH, label: availabilityMessages.picker.goToAppointments },
})
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
    if (isWeeklyBlockOverlap(result.error)) return { status: 'conflict', message: availabilityMessages.weekly.overlap }
    return invalid([availabilityMessages.validation.startBeforeEnd])
  }
  return done(availabilityMessages.weekly.savedOk)
}

export async function removeWeeklyBlockAction(
  _prev: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  if (!(await isStaff())) return forbidden()
  const parsed = removeFormSchema.safeParse(fields(formData))
  if (!parsed.success) return { status: 'conflict', message: availabilityMessages.notFound }

  const needsConfirmation = await confirmationNeeded(formData, () =>
    availabilityService.countAffectedByWeeklyBlock(parsed.data.id),
  )
  if (needsConfirmation) return needsConfirmation

  const result = await availabilityService.removeWeeklyBlock(parsed.data.id)
  if (isErr(result) && isAvailabilityEntryNotFound(result.error)) {
    return { status: 'conflict', message: availabilityMessages.notFound }
  }
  return done(availabilityMessages.weekly.removedOk)
}

export async function addClosedDateAction(
  _prev: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  if (!(await isStaff())) return forbidden()
  const parsed = closedDateFormSchema.safeParse(fields(formData))
  if (!parsed.success) return fromZod(parsed.error)

  const needsConfirmation = await confirmationNeeded(formData, () =>
    availabilityService.countAffectedOnDate(parsed.data.date),
  )
  if (needsConfirmation) return needsConfirmation

  const result = await availabilityService.addClosedDate(parsed.data)
  if (isErr(result)) {
    if (isClosedDateAlreadyExists(result.error)) return { status: 'conflict', message: availabilityMessages.closed.alreadyClosed }
    return invalid([availabilityMessages.validation.date])
  }
  return done(availabilityMessages.closed.savedOk)
}

export async function removeClosedDateAction(
  _prev: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  if (!(await isStaff())) return forbidden()
  const parsed = removeFormSchema.safeParse(fields(formData))
  if (!parsed.success) return { status: 'conflict', message: availabilityMessages.notFound }

  const result = await availabilityService.removeClosedDate(parsed.data.id)
  if (isErr(result) && isAvailabilityEntryNotFound(result.error)) {
    return { status: 'conflict', message: availabilityMessages.notFound }
  }
  return done(availabilityMessages.closed.removedOk)
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
  const startsAt = studioLocalToUtc(date, start)
  const endsAt = studioLocalToUtc(date, end)

  const result = await availabilityService.addManualBlock({ startsAt, endsAt, reason })
  if (isErr(result)) {
    if (isManualBlockOverlap(result.error)) return { status: 'conflict', message: availabilityMessages.blocks.overlap }
    if (isManualBlockHasAppointment(result.error)) {
      return resolveAppointmentFirst(availabilityMessages.blocks.hasAppointment)
    }
    return invalid([availabilityMessages.validation.startBeforeEnd])
  }
  return done(availabilityMessages.blocks.savedOk)
}

export async function blockSlotsAction(
  _prev: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  if (!(await isStaff())) return forbidden()
  const parsed = blockSlotsFormSchema.safeParse({
    date: formData.get(BLOCK_SLOTS_FIELDS.date) ?? undefined,
    slotStartMinutes: formData.getAll(BLOCK_SLOTS_FIELDS.slot),
    reason: formData.get(BLOCK_SLOTS_FIELDS.reason) ?? undefined,
  })
  if (!parsed.success) return fromZod(parsed.error)

  const result = await availabilityService.blockSlots(parsed.data)
  if (isErr(result)) {
    revalidatePath(AVAILABILITY_PATH)
    if (isManualBlockOverlap(result.error)) return { status: 'conflict', message: availabilityMessages.picker.overlap }
    if (isManualBlockHasAppointment(result.error)) {
      return resolveAppointmentFirst(availabilityMessages.picker.hasAppointment)
    }
    return { status: 'conflict', message: availabilityMessages.picker.stale }
  }
  return done(availabilityMessages.picker.savedOk)
}

export async function releaseSlotsAction(
  _prev: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  if (!(await isStaff())) return forbidden()
  const parsed = releaseSlotsFormSchema.safeParse({
    date: formData.get(BLOCK_SLOTS_FIELDS.date) ?? undefined,
    slotStartMinutes: formData.getAll(BLOCK_SLOTS_FIELDS.slot),
  })
  if (!parsed.success) return fromZod(parsed.error)

  const result = await availabilityService.releaseSlots(parsed.data)
  if (isErr(result)) {
    revalidatePath(AVAILABILITY_PATH)
    if (isManualBlockNotBlocked(result.error)) {
      return { status: 'conflict', message: availabilityMessages.picker.alreadyReleased }
    }
    if (isManualBlockHasAppointment(result.error)) {
      return resolveAppointmentFirst(availabilityMessages.picker.releaseHasAppointment)
    }
    return { status: 'conflict', message: availabilityMessages.picker.releaseStale }
  }
  return done(availabilityMessages.picker.releasedOk)
}

export async function removeManualBlockAction(
  _prev: AvailabilityActionState,
  formData: FormData,
): Promise<AvailabilityActionState> {
  if (!(await isStaff())) return forbidden()
  const parsed = removeFormSchema.safeParse(fields(formData))
  if (!parsed.success) return { status: 'conflict', message: availabilityMessages.notFound }

  const result = await availabilityService.removeManualBlock(parsed.data.id)
  if (isErr(result) && isAvailabilityEntryNotFound(result.error)) {
    return { status: 'conflict', message: availabilityMessages.notFound }
  }
  return done(availabilityMessages.blocks.removedOk)
}
