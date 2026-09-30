'use server'

import { revalidatePath } from 'next/cache'
import { isErr } from '@/shared/result'
import { exemptClient, ClientAlreadyExempt } from '@/features/payments'
import { listClientsAction } from '@/features/clients'
import { getAuthSession } from '@/features/auth'
import { isStaff } from './require-staff'
import { exemptClientFormSchema } from './schema'
import { paymentsMessages } from './messages'
import type { ExemptClientActionState, SearchClientsResult } from './action-state'

const m = paymentsMessages.exemption
const EXEMPTIONS_PATH = '/admin/payments'

function forbidden(): ExemptClientActionState {
  return { status: 'forbidden', message: m.accessDenied }
}

export async function searchClientsAction(name: string): Promise<SearchClientsResult> {
  if (!(await isStaff())) return { ok: false }
  if (name.trim().length === 0) return { ok: true, clients: [] }

  const result = await listClientsAction({ name, pageSize: 10 })
  return result.ok ? { ok: true, clients: result.clients } : { ok: false }
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
    return { status: 'invalid', problems: result.error.problems }
  }

  revalidatePath(EXEMPTIONS_PATH)
  return { status: 'ok', message: m.savedOk }
}
