'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { isErr } from '@/shared/result'
import { decideCase } from '@/features/delinquency/application/decide-case'
import type { CaseDecision } from '@/features/delinquency/domain/delinquency-case'
import { isCaseAlreadyDecided, isCaseNotFound } from '@/features/delinquency/domain/errors'
import { caseRepository } from '@/features/delinquency/db/case-repository'
import { DELINQUENCY_ADMIN_PATH, REVIEW_ERRORS } from '@/features/delinquency/ui/review/constants/review-strings'
import { decideCaseSchema } from '@/features/delinquency/ui/review/validation/decide-case-schema'
import type { DecideCaseActionResult } from '@/features/delinquency/ui/review/types/review-results'

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
