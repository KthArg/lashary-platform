import { z } from 'zod'
import type { PromotionWriteModel } from '../../../application/promotions/ports'
import { promotionMessages } from '../constants/promotion-strings'

// Validación de formato en el borde, una sola vez, con Zod (DOM-007). El orden de la vigencia
// (ends_at > starts_at) y la existencia/estado del servicio aplicable son invariantes de
// negocio: los aplica buildPromotion / resolveTarget, no este esquema.

const validationMessages = promotionMessages.form.validation

const requiredInt = z.coerce.number().int()

const requiredDateTime = (message: string) =>
  z
    .string()
    .trim()
    .min(1, message)
    .transform((value) => new Date(value))

export const promotionFormSchema = z
  .object({
    targetType: z.enum(['technique', 'package'], {
      errorMap: () => ({ message: validationMessages.targetType }),
    }),
    targetId: z.string().trim().min(1, validationMessages.targetId),
    discountPercent: requiredInt
      .min(1, validationMessages.discountPercent)
      .max(100, validationMessages.discountPercent),
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
