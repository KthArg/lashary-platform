'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { approveRegularization, rejectRegularization } from '@/features/delinquency/application/review-regularization'
import { regularizationReviewRepository } from '@/features/delinquency/db/regularization-review-repository'
import { DELINQUENCY_ADMIN_PATH } from '../../review/constants/review-strings'
import { REVIEW_FIELDS } from '../constants/queue-strings'
import { performApprove, performReject, type ReviewDeps } from '../utils/perform-review'
import type { ReviewActionResult } from '../types/review-results'

// La base vuelve a exigir administradora (SEC-001); esto solo corta antes a quien no lo es.
async function createDeps(): Promise<ReviewDeps> {
  await requireAdminSession()
  const repository = regularizationReviewRepository(await createClient())
  return { approve: approveRegularization(repository), reject: rejectRegularization(repository) }
}

export async function approveRegularizationAction(_previous: ReviewActionResult | null, formData: FormData): Promise<ReviewActionResult> {
  const result = await performApprove(
    { requestId: formData.get(REVIEW_FIELDS.requestId), approvedAmount: formData.get(REVIEW_FIELDS.approvedAmount) },
    await createDeps(),
  )
  if (result.ok) revalidatePath(DELINQUENCY_ADMIN_PATH)
  return result
}

export async function rejectRegularizationAction(_previous: ReviewActionResult | null, formData: FormData): Promise<ReviewActionResult> {
  const result = await performReject(
    { requestId: formData.get(REVIEW_FIELDS.requestId), reason: formData.get(REVIEW_FIELDS.reason) },
    await createDeps(),
  )
  if (result.ok) revalidatePath(DELINQUENCY_ADMIN_PATH)
  return result
}
