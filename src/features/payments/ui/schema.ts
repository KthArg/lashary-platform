import { z } from 'zod'
import { paymentsMessages } from './messages'

// Validación de formato en el borde, una sola vez, con Zod (DOM-007). Hacia adentro los datos
// se asumen válidos de formato; los invariantes de negocio los aplica DepositExemption.
const v = paymentsMessages.exemption.validation

export const exemptClientFormSchema = z.object({
  clientId: z.string().trim().min(1, v.clientId),
  reason: z.string().trim().min(1, v.reason),
})

export type ExemptClientFormInput = z.input<typeof exemptClientFormSchema>
