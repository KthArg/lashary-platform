import { describe, it, expect, vi } from 'vitest'
import { err, ok, isErr, isOk } from '@/shared/result'
import { loadCaseDetail } from '../load-case-detail'
import type { CaseDetailRecord, DetailRequest, TimelineEvent } from '../../domain/case-detail'
import { caseNotFound, delinquencyStorageFailed } from '../../domain/errors'
import type { AppointmentSummariesPort, AuditTimelinePort, CaseDetailRepository, ClientNamesPort } from '../ports'

const CASE_ID = '7b0e5f8e-3c1a-4c55-9c1e-2f4a6b8d0e11'
const ANA = '1c9d1f0e-5a4b-4e0e-8d52-0d6a3e6f9a21'
const APPOINTMENT = '5a0b5d4c-9e8f-4c4c-a196-4a0e7c0d3e65'
const startsAtMs = Date.parse('2026-10-30T16:00:00Z')

const pendingRequest: DetailRequest = {
  id: '8c1f6a9f-4d2b-4d66-8d2f-3a5b7c9e1f22',
  state: 'pending_approval',
  declaredAmount: 10000,
  reference: null,
  approvedAmount: null,
  rejectionReason: null,
  createdAt: new Date('2026-11-12T15:00:00Z'),
  reviewedAt: null,
}
const record: CaseDetailRecord = {
  caseId: CASE_ID,
  clientId: ANA,
  appointmentId: APPOINTMENT,
  pending: 20000,
  pendingToday: 12000,
  state: 'active',
  detectedAt: new Date('2026-11-10T15:00:00Z'),
  decidedAt: new Date('2026-11-11T15:00:00Z'),
  settledAt: null,
  exceptionReason: null,
  exceptionAmount: null,
  requests: [pendingRequest],
}
const events: TimelineEvent[] = [
  {
    id: 'e1',
    action: 'delinquency.case.confirmed',
    actorId: 'admin',
    createdAt: new Date('2026-11-11T15:00:00Z'),
    entityType: 'delinquency_case',
  },
]
const storageFailure = delinquencyStorageFailed('caída')

interface Overrides {
  detail?: CaseDetailRepository
  names?: ClientNamesPort
  appointments?: AppointmentSummariesPort
  timeline?: AuditTimelinePort
}

function build(overrides: Overrides = {}) {
  const detail = overrides.detail ?? { find: vi.fn(async () => ok(record)) }
  const names = overrides.names ?? { namesFor: vi.fn(async () => ok(new Map([[ANA, 'Ana Pérez']]))) }
  const appointments = overrides.appointments ?? {
    summariesFor: vi.fn(async () => ok(new Map([[APPOINTMENT, { startsAtMs, serviceName: 'Volumen ruso' }]]))),
  }
  const timeline = overrides.timeline ?? { timelineFor: vi.fn(async () => ok(events)) }
  return { detail, names, appointments, timeline, run: loadCaseDetail({ detail, names, appointments, timeline }) }
}

describe('loadCaseDetail', () => {
  it('arma el detalle con nombre, cita, solicitudes, bitácora y el estado mostrado', async () => {
    const { names, appointments, timeline, run } = build()
    const result = await run(CASE_ID)

    expect(isOk(result) && result.value).toEqual({
      caseId: CASE_ID,
      clientId: ANA,
      clientName: 'Ana Pérez',
      pending: 20000,
      pendingToday: 12000,
      state: 'pending_approval',
      detectedAt: record.detectedAt,
      decidedAt: record.decidedAt,
      settledAt: null,
      exceptionReason: null,
      exceptionAmount: null,
      appointment: { startsAtMs, serviceName: 'Volumen ruso' },
      appointmentUnavailable: false,
      requests: [pendingRequest],
      timeline: events,
      timelineUnavailable: false,
    })
    expect(names.namesFor).toHaveBeenCalledWith([ANA])
    expect(appointments.summariesFor).toHaveBeenCalledWith([APPOINTMENT])
    expect(timeline.timelineFor).toHaveBeenCalledWith({ caseId: CASE_ID, requestIds: [pendingRequest.id] })
  })

  it('un id que no es uuid es no encontrada y no consulta nada', async () => {
    const { detail, run } = build()
    const result = await run('no-es-un-uuid')

    expect(isErr(result) && result.error).toEqual(caseNotFound('no-es-un-uuid'))
    expect(detail.find).not.toHaveBeenCalled()
  })

  it('si la morosidad no existe o falla su lectura devuelve ese error sin pedir lo demás', async () => {
    for (const failure of [caseNotFound(CASE_ID), storageFailure]) {
      const { names, run } = build({ detail: { find: async () => err(failure) } })
      const result = await run(CASE_ID)

      expect(isErr(result) && result.error).toEqual(failure)
      expect(names.namesFor).not.toHaveBeenCalled()
    }
  })

  it('si falla el nombre devuelve el error', async () => {
    const result = await build({ names: { namesFor: async () => err(storageFailure) } }).run(CASE_ID)

    expect(isErr(result) && result.error).toEqual(storageFailure)
  })

  it('sin nombre registrado la clienta queda sin nombre', async () => {
    const result = await build({ names: { namesFor: async () => ok(new Map()) } }).run(CASE_ID)

    expect(isOk(result) && result.value.clientName).toBeNull()
  })

  it('si fallan las citas el detalle sale sin cita y lo avisa', async () => {
    const result = await build({ appointments: { summariesFor: async () => err(storageFailure) } }).run(CASE_ID)

    expect(isOk(result) && result.value).toMatchObject({
      appointment: null,
      appointmentUnavailable: true,
      timelineUnavailable: false,
    })
  })

  it('si falla la bitácora el detalle sale con la lista vacía y lo avisa', async () => {
    const result = await build({ timeline: { timelineFor: async () => err(storageFailure) } }).run(CASE_ID)

    expect(isOk(result) && result.value).toMatchObject({
      timeline: [],
      timelineUnavailable: true,
      appointmentUnavailable: false,
    })
  })
})
