'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { isErr } from '@/shared/result'
import { decideCase } from '@/features/delinquency/application/decide-case'
import { forgiveCase } from '@/features/delinquency/application/forgive-case'
import { changeGraceDays } from '@/features/delinquency/application/grace-days'
import { liftCase } from '@/features/delinquency/application/lift-case'
import type { CaseDecision } from '@/features/delinquency/domain/delinquency-case'
import {
  isCaseAlreadyDecided,
  isCaseNotActive,
  isCaseNotFound,
  isInvalidForgiveAmount,
  isInvalidGraceDays,
  isInvalidReason,
} from '@/features/delinquency/domain/errors'
import { caseRepository } from '@/features/delinquency/db/case-repository'
import { settingsRepository } from '@/features/delinquency/db/settings-repository'
import { DELINQUENCY_ADMIN_PATH, REVIEW_ERRORS } from '@/features/delinquency/ui/review/constants/review-strings'
import { decideCaseSchema } from '@/features/delinquency/ui/review/validation/decide-case-schema'
import { forgiveCaseSchema } from '@/features/delinquency/ui/review/validation/forgive-case-schema'
import { graceDaysSchema } from '@/features/delinquency/ui/review/validation/grace-days-schema'
import { liftCaseSchema } from '@/features/delinquency/ui/review/validation/lift-case-schema'
import type {
  DecideCaseActionResult,
  ForgiveCaseActionResult,
  LiftCaseActionResult,
  SetGraceDaysActionResult,
} from '@/features/delinquency/ui/review/types/review-results'

export async function decideCaseAction(input: unknown): Promise<DecideCaseActionResult> {
  await requireAdminSession()

  const parsed = decideCaseSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: REVIEW_ERRORS.invalidInput }

  const result = await decideCase(caseRepository(await createClient()))({
    caseId: parsed.data.caseId,
    decision: parsed.data.decision as CaseDecision,
  })
  if (isErr(result)) {
    if (isCaseNotFound(result.error)) return { ok: false, error: REVIEW_ERRORS.notFound }
    if (isCaseAlreadyDecided(result.error)) return { ok: false, error: REVIEW_ERRORS.alreadyDecided }
    return { ok: false, error: REVIEW_ERRORS.saveFailed }
  }

  revalidatePath(DELINQUENCY_ADMIN_PATH)
  return { ok: true, state: result.value.state }
}

export async function setGraceDaysAction(input: unknown): Promise<SetGraceDaysActionResult> {
  await requireAdminSession()

  const parsed = graceDaysSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: REVIEW_ERRORS.invalidGraceDays }

  const result = await changeGraceDays(settingsRepository(await createClient()))(parsed.data.graceDays)
  if (isErr(result)) {
    if (isInvalidGraceDays(result.error)) return { ok: false, error: REVIEW_ERRORS.invalidGraceDays }
    return { ok: false, error: REVIEW_ERRORS.graceSaveFailed }
  }

  revalidatePath(DELINQUENCY_ADMIN_PATH)
  return { ok: true, graceDays: result.value }
}

export async function liftCaseAction(input: unknown): Promise<LiftCaseActionResult> {
  await requireAdminSession()

  const parsed = liftCaseSchema.safeParse(input)
  if (!parsed.success) {
    const failsOn = (field: string) => parsed.error.issues.some((issue) => issue.path[0] === field)
    if (failsOn('caseId')) return { ok: false, error: REVIEW_ERRORS.invalidInput }
    return { ok: false, error: REVIEW_ERRORS.invalidReason }
  }

  const result = await liftCase(caseRepository(await createClient()))({
    caseId: parsed.data.caseId,
    reason: parsed.data.reason,
  })
  if (isErr(result)) {
    if (isCaseNotFound(result.error)) return { ok: false, error: REVIEW_ERRORS.notFound }
    if (isCaseNotActive(result.error)) return { ok: false, error: REVIEW_ERRORS.caseNotActive }
    if (isInvalidReason(result.error)) return { ok: false, error: REVIEW_ERRORS.invalidReason }
    return { ok: false, error: REVIEW_ERRORS.liftFailed }
  }

  revalidatePath(DELINQUENCY_ADMIN_PATH)
  return { ok: true, state: result.value.state }
}

export async function forgiveCaseAction(input: unknown): Promise<ForgiveCaseActionResult> {
  await requireAdminSession()

  const parsed = forgiveCaseSchema.safeParse(input)
  if (!parsed.success) {
    const failsOn = (field: string) => parsed.error.issues.some((issue) => issue.path[0] === field)
    if (failsOn('caseId')) return { ok: false, error: REVIEW_ERRORS.invalidInput }
    if (failsOn('amount')) return { ok: false, error: REVIEW_ERRORS.invalidForgiveAmount }
    return { ok: false, error: REVIEW_ERRORS.invalidReason }
  }

  const result = await forgiveCase(caseRepository(await createClient()))({
    caseId: parsed.data.caseId,
    amount: parsed.data.amount,
    reason: parsed.data.reason,
  })
  if (isErr(result)) {
    if (isCaseNotFound(result.error)) return { ok: false, error: REVIEW_ERRORS.notFound }
    if (isCaseNotActive(result.error)) return { ok: false, error: REVIEW_ERRORS.caseNotActive }
    if (isInvalidForgiveAmount(result.error)) return { ok: false, error: REVIEW_ERRORS.invalidForgiveAmount }
    if (isInvalidReason(result.error)) return { ok: false, error: REVIEW_ERRORS.invalidReason }
    return { ok: false, error: REVIEW_ERRORS.forgiveFailed }
  }

  revalidatePath(DELINQUENCY_ADMIN_PATH)
  return { ok: true, state: result.value.state, exceptionAmount: result.value.exceptionAmount }
}
