import { z } from 'zod'
import { parseStudioDateTimeInput } from '@/shared/studio-time'
import type { PromotionWriteModel } from '../../../application/promotions/ports'
import { promotionMessages } from '../constants/promotion-strings'

const validationMessages = promotionMessages.form.validation

const requiredInt = z.coerce.number().int()

const requiredDateTime = (message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .transform((value, ctx) => {
      const parsed = parseStudioDateTimeInput(value)
      if (parsed === null) {
        ctx.addIssue({ code: 'custom', message })
        return z.NEVER
      }
      return parsed
    })

export const promotionFormSchema = z
  .object({
    targetType: z.enum(['technique', 'package'], { message: validationMessages.targetType }),
    targetId: z.string().trim().uuid(validationMessages.targetId),
    discountPercent: requiredInt
      .min(1, validationMessages.discountPercent)
      .max(99, validationMessages.discountPercent),
    startsAt: requiredDateTime(validationMessages.startsAt),
    endsAt: requiredDateTime(validationMessages.endsAt),
  })
  .transform(
    (data): PromotionWriteModel => ({
      target:
        data.targetType === 'technique'
          ? { type: 'technique', techniqueId: data.targetId }
          : { type: 'package', packageId: data.targetId },
      discountPercent: data.discountPercent,
      startsAt: data.startsAt,
      endsAt: data.endsAt,
    }),
  )

export type PromotionFormInput = z.input<typeof promotionFormSchema>
