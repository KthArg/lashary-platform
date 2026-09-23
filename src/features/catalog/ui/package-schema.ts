import { z } from 'zod'
import type { PackageWriteModel } from '../application/ports'
import { catalogMessages } from './messages'

// Validación de formato en el borde, una sola vez, con Zod (DOM-007). El invariante de negocio
// (mínimo dos técnicas sin duplicados) lo vuelve a aplicar Package.create — este schema solo
// exige "al menos dos" para dar el mensaje de formulario correcto antes de llegar ahí.

const v = catalogMessages.packages.form.validation

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
