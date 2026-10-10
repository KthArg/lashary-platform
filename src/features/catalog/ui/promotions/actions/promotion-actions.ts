'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { isErr } from '@/shared/result'
import { isStaff } from '../../require-staff'
import {
  createPromotion,
  updatePromotion,
  deactivatePromotion,
  type PromotionCommandDeps,
} from '../../../application/promotions/commands'
import { promotionRepository } from '../../../db/promotions/promotion-repository'
import { techniqueRepository } from '../../../db/techniques/technique-repository'
import { packageRepository } from '../../../db/packages/package-repository'
import { promotionFormSchema } from '../validation/promotion-schema'
import { promotionMessages } from '../constants/promotion-strings'
import { catalogRoutes } from '../../routes'
import type { PromotionActionState } from '../types/promotion-action-state'

async function deps(): Promise<PromotionCommandDeps> {
  return {
    promotionRepo: await promotionRepository(),
    techniqueRepo: await techniqueRepository(),
    packageRepo: await packageRepository(),
    newId: () => randomUUID(),
  }
}

function forbidden(): PromotionActionState {
  return { status: 'forbidden', message: promotionMessages.form.accessDenied }
}

function parseForm(formData: FormData) {
  return promotionFormSchema.safeParse({
    targetType: formData.get('targetType'),
    targetId: formData.get('targetId'),
    discountPercent: formData.get('discountPercent'),
    startsAt: formData.get('startsAt'),
    endsAt: formData.get('endsAt'),
  })
}

export async function createPromotionAction(
  _prev: PromotionActionState,
  formData: FormData,
): Promise<PromotionActionState> {
  if (!(await isStaff())) return forbidden()

  const parsed = parseForm(formData)
  if (!parsed.success) {
    return { status: 'invalid', problems: parsed.error.issues.map((issue) => issue.message) }
  }
  const result = await createPromotion(await deps())(parsed.data)
  if (isErr(result)) {
    return { status: 'invalid', problems: result.error.problems }
  }
  revalidatePath(catalogRoutes.promotionsAdmin)
  return { status: 'ok', message: promotionMessages.form.savedCreate }
}

export async function updatePromotionAction(
  _prev: PromotionActionState,
  formData: FormData,
): Promise<PromotionActionState> {
  if (!(await isStaff())) return forbidden()

  const id = String(formData.get('id') ?? '')
  const parsed = parseForm(formData)
  if (!parsed.success) {
    return { status: 'invalid', problems: parsed.error.issues.map((issue) => issue.message) }
  }
  const result = await updatePromotion(await deps())(id, parsed.data)
  if (isErr(result)) {
    return {
      status: 'invalid',
      problems: 'problems' in result.error ? result.error.problems : [result.error.message],
    }
  }
  revalidatePath(catalogRoutes.promotionsAdmin)
  return { status: 'ok', message: promotionMessages.form.savedEdit }
}

export async function deactivatePromotionAction(
  _prev: PromotionActionState,
  formData: FormData,
): Promise<PromotionActionState> {
  if (!(await isStaff())) return forbidden()

  const id = String(formData.get('id') ?? '')

  const result = await deactivatePromotion(await deps())(id)
  if (isErr(result)) {
    return { status: 'invalid', problems: [result.error.message] }
  }
  revalidatePath(catalogRoutes.promotionsAdmin)
  return { status: 'ok', message: promotionMessages.form.deactivated }
}
