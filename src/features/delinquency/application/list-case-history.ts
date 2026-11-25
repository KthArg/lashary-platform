import { ok, isErr, type Result } from '@/shared/result'
import { displayedState, normalizeHistoryQuery } from '../domain/case-history'
import type { CaseHistoryPage, HistoryQueryInput } from '../domain/case-history'
import type { DelinquencyStorageFailed } from '../domain/errors'
import type { AppointmentSummariesPort, CaseHistoryRepository, ClientNamesPort } from './ports'

export const listCaseHistory =
  (deps: { history: CaseHistoryRepository; names: ClientNamesPort; appointments: AppointmentSummariesPort }) =>
  async (input: HistoryQueryInput): Promise<Result<CaseHistoryPage, DelinquencyStorageFailed>> => {
    const query = normalizeHistoryQuery(input)
    const read = await deps.history.list(query)
    if (isErr(read)) return read
    const { rows, total } = read.value
    const pageInfo = { total, page: query.page, pageSize: query.pageSize }
    if (rows.length === 0) return ok({ ...pageInfo, items: [], appointmentsUnavailable: false })

    const clientIds = [...new Set(rows.map((row) => row.clientId))]
    const appointmentIds = [...new Set(rows.map((row) => row.appointmentId))]
    const [names, appointments] = await Promise.all([
      deps.names.namesFor(clientIds),
      deps.appointments.summariesFor(appointmentIds),
    ])
    if (isErr(names)) return names

    return ok({
      ...pageInfo,
      appointmentsUnavailable: isErr(appointments),
      items: rows.map((row) => ({
        caseId: row.caseId,
        clientName: names.value.get(row.clientId) ?? null,
        pending: row.pending,
        appointment: isErr(appointments) ? null : (appointments.value.get(row.appointmentId) ?? null),
        detectedAt: row.detectedAt,
        state: displayedState(row.state, row.hasPendingRequest),
      })),
    })
  }
