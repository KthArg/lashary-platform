import type { ClientFieldKey } from '../constants/client-form'

export interface ClientFormValues { fullName: string; phone: string; email: string; notes: string }

export type ClientFormErrors = Partial<Record<ClientFieldKey, string>>
