import { ok, isErr, err, type Result } from '@/shared/result'
import { displayedState } from '../domain/case-history'
import { hasPendingRequest, isCaseId, type CaseDetail } from '../domain/case-detail'
import { caseNotFound, type CaseNotFound, type DelinquencyStorageFailed } from '../domain/errors'
import type { AppointmentSummariesPort, AuditTimelinePort, CaseDetailRepository, ClientNamesPort } from './ports'

export const loadCaseDetail =
  (deps: {
    detail: CaseDetailRepository
    names: ClientNamesPort
    appointments: AppointmentSummariesPort
    timeline: AuditTimelinePort
  }) =>
  async (caseId: string): Promise<Result<CaseDetail, CaseNotFound | DelinquencyStorageFailed>> => {
    if (!isCaseId(caseId)) return err(caseNotFound(caseId))
    const read = await deps.detail.find(caseId)
    if (isErr(read)) return read
    const { appointmentId, state, ...record } = read.value

    const [names, appointments, timeline] = await Promise.all([
      deps.names.namesFor([record.clientId]),
      deps.appointments.summariesFor([appointmentId]),
      deps.timeline.timelineFor({ caseId, requestIds: record.requests.map((request) => request.id) }),
    ])
    if (isErr(names)) return names

    return ok({
      ...record,
      clientName: names.value.get(record.clientId) ?? null,
      state: displayedState(state, hasPendingRequest(record.requests)),
      appointment: isErr(appointments) ? null : (appointments.value.get(appointmentId) ?? null),
      appointmentUnavailable: isErr(appointments),
      timeline: isErr(timeline) ? [] : timeline.value,
      timelineUnavailable: isErr(timeline),
    })
  }
