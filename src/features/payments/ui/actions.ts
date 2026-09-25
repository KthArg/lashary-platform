'use server'

import { revalidatePath } from 'next/cache'
import { isErr } from '@/shared/result'
import { exemptClient, ClientAlreadyExempt } from '@/features/payments'
import { listClientsAction, type ClientRecord } from '@/features/clients'
import { getAuthSession } from '@/features/auth'
import { isStaff } from './require-staff'
import { exemptClientFormSchema } from './schema'
import { paymentsMessages } from './messages'
import type { ExemptClientActionState } from './action-state'

const m = paymentsMessages.exemption
const EXEMPTIONS_PATH = '/admin/payments'

function forbidden(): ExemptClientActionState {
  return { status: 'forbidden', message: m.accessDenied }
}

// Búsqueda de clienta para el selector del formulario — reusa el contrato público de clients
// (listClientsAction, ARCH-003), no le agrega nada propio.
export async function searchClientsAction(name: string): Promise<ClientRecord[]> {
  if (!(await isStaff())) return []
  if (name.trim().length === 0) return []

  const result = await listClientsAction({ name, pageSize: 10 })
  return result.ok ? result.clients : []
}

export async function exemptClientAction(
  _prev: ExemptClientActionState,
  formData: FormData,
): Promise<ExemptClientActionState> {
  if (!(await isStaff())) return forbidden()

  const parsed = exemptClientFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      status: 'invalid',
      problems: parsed.error.issues.map((issue) => issue.message),
    }
  }

  const session = await getAuthSession()
  if (!session) return forbidden()

  const result = await exemptClient({
    clientId: parsed.data.clientId,
    exemptedBy: session.user.id,
    reason: parsed.data.reason,
  })

  if (isErr(result)) {
    if (result.error instanceof ClientAlreadyExempt) {
      return { status: 'conflict', message: m.alreadyExempt }
    }
    // El único error que queda tras excluir ClientAlreadyExempt es DepositExemptionValidationError.
    return { status: 'invalid', problems: result.error.problems }
  }

  revalidatePath(EXEMPTIONS_PATH)
  return { status: 'ok', message: m.savedOk }
}
