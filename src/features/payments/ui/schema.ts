import { z } from 'zod'
import { paymentsMessages } from './messages'

const v = paymentsMessages.exemption.validation

export const exemptClientFormSchema = z.object({
  clientId: z.string().trim().min(1, v.clientId),
  reason: z.string().trim().min(1, v.reason),
})

export type ExemptClientFormInput = z.input<typeof exemptClientFormSchema>
