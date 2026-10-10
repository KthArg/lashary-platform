import { z } from 'zod'
import type { PackageWriteModel } from '../../../application/packages/ports'
import { packageMessages } from '../constants/package-strings'

const validationMessages = packageMessages.form.validation

const requiredInt = z.coerce.number().int()

export const packageFormSchema = z
  .object({
    name: z.string().trim().min(1, validationMessages.name),
    techniqueIds: z.array(z.string().trim().min(1)).min(2, validationMessages.techniqueIds),
    price: requiredInt.positive(validationMessages.price),
    deposit: z.union([
      z.string().trim().regex(/^\d+$/, validationMessages.deposit).transform(Number),
      z.number(),
    ]).refine((value) => Number.isSafeInteger(value) && value >= 0, validationMessages.deposit),
  })
  .transform(
    (data): PackageWriteModel => ({
      name: data.name,
      techniqueIds: data.techniqueIds,
      price: data.price,
      deposit: data.deposit,
    }),
  )

export type PackageFormInput = z.input<typeof packageFormSchema>
