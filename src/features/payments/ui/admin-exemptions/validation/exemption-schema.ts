import { z } from 'zod'
import { exemptionMessages } from '../constants/exemption-strings'

const validationMessages = exemptionMessages.validation

export const exemptClientFormSchema = z.object({
  clientId: z.string().trim().min(1, validationMessages.clientId),
  reason: z.string().trim().min(1, validationMessages.reason),
})

export type ExemptClientFormInput = z.input<typeof exemptClientFormSchema>
