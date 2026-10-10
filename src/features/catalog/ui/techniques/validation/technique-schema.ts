import { z } from 'zod'
import { SERVICE_FAMILIES } from '../../../domain/techniques/technique'
import type { TechniqueWriteModel } from '../../../application/techniques/ports'
import { catalogMessages } from '../constants/technique-strings'

const validationMessages = catalogMessages.form.validation

const requiredInt = z.coerce.number().int()

const optionalPositiveInt = z
  .union([z.literal(''), z.coerce.number().int().positive()])
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .transform((value) => value ?? null)

export const techniqueFormSchema = z
  .object({
    name: z.string().trim().min(1, validationMessages.name),
    family: z.enum(SERVICE_FAMILIES, {
      errorMap: () => ({ message: validationMessages.family }),
    }),
    priceFirstTime: requiredInt.positive(validationMessages.priceFirstTime),
    priceRetouch: optionalPositiveInt,
    durationFirstTimeMin: requiredInt.positive(validationMessages.durationFirstTimeMin),
    durationRetouchMin: optionalPositiveInt,
    bufferMin: requiredInt.min(0, validationMessages.bufferMin),
    reapplicationIntervalDays: optionalPositiveInt,
    deposit: requiredInt.min(0, validationMessages.deposit),
    aftercareText: z.string().trim().min(1, validationMessages.aftercareText),
  })
  .transform(
    (data): TechniqueWriteModel => ({
      name: data.name,
      family: data.family,
      priceFirstTime: data.priceFirstTime,
      priceRetouch: data.priceRetouch,
      durationFirstTimeMin: data.durationFirstTimeMin,
      durationRetouchMin: data.durationRetouchMin,
      bufferMin: data.bufferMin,
      reapplicationIntervalDays: data.reapplicationIntervalDays,
      deposit: data.deposit,
      aftercareText: data.aftercareText,
    }),
  )

export type TechniqueFormInput = z.input<typeof techniqueFormSchema>
