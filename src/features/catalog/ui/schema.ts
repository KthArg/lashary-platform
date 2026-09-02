import { z } from 'zod'
import { SERVICE_FAMILIES } from '../domain/technique'
import type { TechniqueWriteModel } from '../application/ports'

// Validación de formato en el borde, una sola vez, con Zod (DOM-007). Hacia adentro los datos
// se asumen válidos de formato; los invariantes de negocio (D10, etc.) los aplica Technique.

const requiredInt = z.coerce.number().int()

// Campo numérico opcional: '' (o ausente) -> null; si viene, entero positivo.
const optionalPositiveInt = z
  .union([z.literal(''), z.coerce.number().int().positive()])
  .transform((value) => (value === '' ? null : value))
  .nullable()
  .transform((value) => value ?? null)

export const techniqueFormSchema = z
  .object({
    name: z.string().trim().min(1, 'El nombre es obligatorio'),
    family: z.enum(SERVICE_FAMILIES, {
      errorMap: () => ({ message: 'Elegí una familia de servicio válida' }),
    }),
    priceFirstTime: requiredInt.positive('El precio de primera vez debe ser mayor que cero'),
    priceRetouch: optionalPositiveInt,
    durationFirstTimeMin: requiredInt.positive('La duración de primera vez debe ser mayor que cero'),
    durationRetouchMin: optionalPositiveInt,
    bufferMin: requiredInt.min(0, 'El tiempo de preparación y limpieza no puede ser negativo'),
    reapplicationIntervalDays: optionalPositiveInt,
    deposit: requiredInt.min(0, 'El anticipo no puede ser negativo'),
    aftercareText: z.string().trim().min(1, 'El texto de cuidados posteriores es obligatorio'),
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
