import { requireAdminSession } from '@/features/auth'
import { isErr } from '@/shared/result'
import { getClient } from '@/features/clients/application/queries'
import { viewAppointmentHistory } from '@/features/clients/application/history/view-appointment-history'
import { schedulingAppointmentHistory } from '@/features/clients/http/history/history-gateways'
import { clientRepository } from '@/features/clients/db/client-repository'
import { noteRepository } from '@/features/clients/db/notes/note-repository'
import { notesByAppointment } from '@/features/clients/application/notes/notes-by-appointment'
import { HISTORY_ERROR_MESSAGES } from '../constants/history-strings'
import { isUuid } from '../../client-routes'
import type { ReadAppointmentHistoryResult } from '../types/history-results'

const CLIENT_NOT_FOUND: ReadAppointmentHistoryResult = {
  ok: false,
  error: HISTORY_ERROR_MESSAGES.clientNotFound,
  notFound: true,
}

const HISTORY_UNAVAILABLE: ReadAppointmentHistoryResult = {
  ok: false,
  error: HISTORY_ERROR_MESSAGES.historyUnavailable,
}

export async function readAppointmentHistory(clientId: string, page?: number): Promise<ReadAppointmentHistoryResult> {
  await requireAdminSession()
  if (!isUuid(clientId)) return CLIENT_NOT_FOUND
  const id = clientId.toLowerCase()
  const client = await getClient(await clientRepository())(id)
  if (isErr(client)) return client.error === 'not-found' ? CLIENT_NOT_FOUND : HISTORY_UNAVAILABLE
  const history = await viewAppointmentHistory(schedulingAppointmentHistory)({ clientId: id, page })
  if (isErr(history)) return HISTORY_UNAVAILABLE
  const historyPage = history.value
  const appointmentIds = historyPage.entries.map((entry) => entry.id)
  const notes = await (await noteRepository()).listForAppointments(id, appointmentIds)
  if (isErr(notes)) return HISTORY_UNAVAILABLE
  const notesOf = notesByAppointment(notes.value)
  return {
    ok: true,
    entries: historyPage.entries.map((entry) => ({ ...entry, notes: notesOf.get(entry.id) ?? [] })),
    total: historyPage.total,
    page: historyPage.page,
    pageSize: historyPage.pageSize,
  }
}
