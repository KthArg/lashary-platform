import { describe, it, expect } from 'vitest'
import { err, isErr, isOk, ok } from '@/shared/result'
import { appointmentNotPending } from '../../domain/errors'
import { APPOINTMENT_DECISION, MAX_DECISION_REASON_LENGTH } from '../../domain/appointment-decision.constants'
import { approveAppointment, rejectAppointment } from '../decide-appointment'
import { APPOINTMENT_ENTITY_TYPE, APPOINTMENT_REJECTED_ACTION } from '../decide-appointment.constants'
import type { AppointmentDecisionRepository, DecideAppointmentInput, RecordAuditEvent } from '../ports'

const APPOINTMENT_ID = 'cita-1'
const ACTOR_ID = 'admin-1'
const REJECTION_REASON = 'horario no disponible'

function createFakes(options: { pending?: boolean; auditFails?: boolean } = {}) {
  const decisions: DecideAppointmentInput[] = []
  const auditEvents: Array<Parameters<RecordAuditEvent>[0]> = []
  const appointments: AppointmentDecisionRepository = {
    async decide(input) {
      decisions.push(input)
      if (options.pending === false) return err(appointmentNotPending(input.appointmentId))
      return ok({ id: input.appointmentId, status: input.decision })
    },
  }
  const recordAuditEvent: RecordAuditEvent = async (event) => {
    auditEvents.push(event)
    return options.auditFails ? err(new Error('bitácora caída')) : ok(undefined)
  }
  return { deps: { appointments, recordAuditEvent }, decisions, auditEvents }
}

describe('approveAppointment', () => {
  it('aprueba sin motivo y sin escribir en la bitácora', async () => {
    const { deps, decisions, auditEvents } = createFakes()

    const result = await approveAppointment(deps, { appointmentId: APPOINTMENT_ID })

    expect(isOk(result) && result.value.status).toBe(APPOINTMENT_DECISION.APPROVED)
    expect(decisions).toEqual([
      { appointmentId: APPOINTMENT_ID, decision: APPOINTMENT_DECISION.APPROVED, reason: null },
    ])
    expect(auditEvents).toEqual([])
  })

  it('una cita que ya no está pendiente devuelve AppointmentNotPending', async () => {
    const { deps } = createFakes({ pending: false })

    const result = await approveAppointment(deps, { appointmentId: APPOINTMENT_ID })

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_APPOINTMENT_NOT_PENDING')
  })
})

describe('rejectAppointment', () => {
  it('rechaza con motivo y deja el evento en la bitácora con el actor de la sesión', async () => {
    const { deps, decisions, auditEvents } = createFakes()

    const result = await rejectAppointment(deps, {
      appointmentId: APPOINTMENT_ID,
      actorId: ACTOR_ID,
      reason: `  ${REJECTION_REASON}  `,
    })

    expect(isOk(result) && result.value.status).toBe(APPOINTMENT_DECISION.REJECTED)
    expect(decisions[0].reason).toBe(REJECTION_REASON)
    expect(auditEvents).toEqual([
      {
        actorId: ACTOR_ID,
        action: APPOINTMENT_REJECTED_ACTION,
        entityType: APPOINTMENT_ENTITY_TYPE,
        entityId: APPOINTMENT_ID,
        payload: { reason: REJECTION_REASON },
      },
    ])
  })

  it('el motivo es opcional: vacío se guarda como null', async () => {
    const { deps, decisions } = createFakes()

    await rejectAppointment(deps, { appointmentId: APPOINTMENT_ID, actorId: ACTOR_ID, reason: '   ' })

    expect(decisions[0].reason).toBeNull()
  })

  it('un motivo demasiado largo se rechaza sin tocar la base ni la bitácora', async () => {
    const { deps, decisions, auditEvents } = createFakes()

    const result = await rejectAppointment(deps, {
      appointmentId: APPOINTMENT_ID,
      actorId: ACTOR_ID,
      reason: 'x'.repeat(MAX_DECISION_REASON_LENGTH + 1),
    })

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_INVALID_DECISION_REASON')
    expect(decisions).toEqual([])
    expect(auditEvents).toEqual([])
  })

  it('si la cita ya no estaba pendiente no escribe en la bitácora', async () => {
    const { deps, auditEvents } = createFakes({ pending: false })

    const result = await rejectAppointment(deps, { appointmentId: APPOINTMENT_ID, actorId: ACTOR_ID })

    expect(isErr(result)).toBe(true)
    expect(auditEvents).toEqual([])
  })

  it('si la bitácora falla el error se propaga', async () => {
    const { deps } = createFakes({ auditFails: true })

    await expect(
      rejectAppointment(deps, { appointmentId: APPOINTMENT_ID, actorId: ACTOR_ID }),
    ).rejects.toThrow('bitácora caída')
  })
})
