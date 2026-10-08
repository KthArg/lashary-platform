'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/features/auth'
import { isErr } from '@/shared/result'
import { addClient, editClient, type ClientCommandError } from '../../../application/commands'
import { listClients } from '../../../application/queries'
import { clientRepository } from '../../../db/client-repository'
import { CLIENTS_ERROR_MESSAGES } from '../constants/client-strings'
import type { ClientFormValues } from '../../../domain/client-form.types'
import type { ListClientsQuery } from '../../../application/ports'
import type { ListClientsResult, SaveClientResult } from '../types/client-action-results'

const CLIENTS_PATH = '/admin/clients'

const COMMAND_ERROR_MESSAGES: Record<ClientCommandError, string> = {
  invalid: CLIENTS_ERROR_MESSAGES.formHasErrors,
  'phone-taken': CLIENTS_ERROR_MESSAGES.phoneTaken,
  'not-found': CLIENTS_ERROR_MESSAGES.clientNotFound,
  failed: CLIENTS_ERROR_MESSAGES.saveFailed,
}

export async function createClientAction(input: ClientFormValues): Promise<SaveClientResult> {
  await requireAdminSession()
  const result = await addClient(await clientRepository())(input)
  if (isErr(result)) return { ok: false, error: COMMAND_ERROR_MESSAGES[result.error] }

  revalidatePath(CLIENTS_PATH)
  return { ok: true, client: result.value }
}

export async function updateClientAction(id: string, input: ClientFormValues): Promise<SaveClientResult> {
  await requireAdminSession()
  const result = await editClient(await clientRepository())(id, input)
  if (isErr(result)) return { ok: false, error: COMMAND_ERROR_MESSAGES[result.error] }

  revalidatePath(CLIENTS_PATH)
  return { ok: true, client: result.value }
}

export async function listClientsAction(query: ListClientsQuery = {}): Promise<ListClientsResult> {
  await requireAdminSession()
  const result = await listClients(await clientRepository())(query)
  if (isErr(result)) return { ok: false, error: CLIENTS_ERROR_MESSAGES.loadFailed }
  return { ok: true, ...result.value }
}
