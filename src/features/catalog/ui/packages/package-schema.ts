import { z } from 'zod'
import type { PackageWriteModel } from '../../application/packages/ports'
import { packageMessages } from './messages'

const v = packageMessages.form.validation

const requiredInt = z.coerce.number().int()

export const packageFormSchema = z
  .object({
    name: z.string().trim().min(1, v.name),
    techniqueIds: z.array(z.string().trim().min(1)).min(2, v.techniqueIds),
    price: requiredInt.positive(v.price),
  })
  .transform(
    (data): PackageWriteModel => ({
      name: data.name,
      techniqueIds: data.techniqueIds,
      price: data.price,
    }),
  )

export type PackageFormInput = z.input<typeof packageFormSchema>
