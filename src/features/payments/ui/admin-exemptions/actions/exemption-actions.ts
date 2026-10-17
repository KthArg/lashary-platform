'use server'

import { revalidatePath } from 'next/cache'
import { isErr } from '@/shared/result'
import { exemptClient, isClientAlreadyExempt } from '@/features/payments'
import { listClientsAction } from '@/features/clients'
import { getStaffSession } from '../../require-staff'
import { exemptClientFormSchema } from '../validation/exemption-schema'
import { exemptionMessages } from '../constants/exemption-strings'
import type {
  ExemptClientActionState,
  SearchClientsResult,
} from '../types/exempt-client-action-state'

const EXEMPTIONS_PATH = '/admin/payments'

function forbidden(): ExemptClientActionState {
  return { status: 'forbidden', message: exemptionMessages.accessDenied }
}

export async function searchClientsAction(name: string): Promise<SearchClientsResult> {
  if (!(await getStaffSession())) return { ok: false }
  if (name.trim().length === 0) return { ok: true, clients: [] }

  const result = await listClientsAction({ name, pageSize: 10 })
  return result.ok ? { ok: true, clients: result.clients } : { ok: false }
}

export async function exemptClientAction(
  _prev: ExemptClientActionState,
  formData: FormData,
): Promise<ExemptClientActionState> {
  const session = await getStaffSession()
  if (!session) return forbidden()

  const parsed = exemptClientFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      status: 'invalid',
      problems: parsed.error.issues.map((issue) => issue.message),
    }
  }

  const result = await exemptClient({
    clientId: parsed.data.clientId,
    exemptedBy: session.user.id,
    reason: parsed.data.reason,
  })

  if (isErr(result)) {
    if (isClientAlreadyExempt(result.error)) {
      return { status: 'conflict', message: exemptionMessages.alreadyExempt }
    }
    return { status: 'invalid', problems: result.error.problems }
  }

  revalidatePath(EXEMPTIONS_PATH)
  return { status: 'ok', message: exemptionMessages.savedOk }
}
