'use server'

import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/features/auth'
import { createClient } from '@/shared/lib/supabase/server'
import { isErr } from '@/shared/result'
import { addClient, editClient, type ClientCommandError } from '../../../application/commands'
import { getClient, getClientDelinquency, listClients } from '../../../application/queries'
import { clientRepository } from '../../../db/client-repository'
import { delinquencyStatesGateway } from '../../../db/delinquency-states-gateway'
import { CLIENTS_ERROR_MESSAGES, CLIENT_PROFILE_LABELS } from '../constants/client-strings'
import { delinquencyLabel } from '../delinquency-label'
import { CLIENTS_PATH, isUuid } from '../../client-routes'
import type { ClientFormValues } from '../../../domain/client-form.types'
import type { ListClientsQuery } from '../../../application/ports'
import type { GetClientResult, ListClientsResult, SaveClientResult } from '../types/client-action-results'

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

export async function getClientAction(id: string): Promise<GetClientResult> {
  await requireAdminSession()
  if (!isUuid(id)) return { ok: false, reason: 'not-found', error: CLIENTS_ERROR_MESSAGES.clientNotFound }
  const result = await getClient(await clientRepository())(id)
  if (isErr(result) && result.error === 'not-found') {
    return { ok: false, reason: 'not-found', error: CLIENTS_ERROR_MESSAGES.clientNotFound }
  }
  if (isErr(result)) return { ok: false, reason: 'failed', error: CLIENTS_ERROR_MESSAGES.loadClientFailed }
  const delinquency = await getClientDelinquency(delinquencyStatesGateway(await createClient()))(id)
  return {
    ok: true,
    client: result.value,
    delinquencyLabel: delinquency ? `${CLIENT_PROFILE_LABELS.delinquencyPrefix}${delinquencyLabel(delinquency)}` : null,
  }
}

export async function listClientsAction(query: ListClientsQuery = {}): Promise<ListClientsResult> {
  await requireAdminSession()
  const result = await listClients(await clientRepository(), delinquencyStatesGateway(await createClient()))(query)
  if (isErr(result) && result.error === 'inverted-visit-range') {
    return { ok: false, reason: 'invalid-visit-range', error: CLIENTS_ERROR_MESSAGES.invertedVisitRange }
  }
  if (isErr(result)) return { ok: false, reason: 'failed', error: CLIENTS_ERROR_MESSAGES.loadFailed }
  return { ok: true, ...result.value }
}
