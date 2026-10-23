import { describe, it, expect } from 'vitest'
import { err, isErr, isOk, ok, type Result } from '@/shared/result'
import { storageFailed, type StorageFailed } from '../../domain/errors'
import {
  CANCELLATION_POLICY_ENTITY_ID,
  CANCELLATION_POLICY_ENTITY_TYPE,
  CANCELLATION_WINDOW_CHANGED_ACTION,
} from '../cancellation-window.constants'
import { changeCancellationWindow, getCancellationWindow } from '../cancellation-window'
import type { CancellationPolicyRepository, RecordAuditEvent } from '../ports'

const ACTOR_ID = '00000000-0000-0000-0000-0000000000ad'
const CURRENT_HOURS = 48

function createFakes(overrides: Partial<CancellationPolicyRepository> = {}, auditFails = false) {
  const writes: number[] = []
  const events: Parameters<RecordAuditEvent>[0][] = []
  const policy: CancellationPolicyRepository = {
    getWindowHours: async () => ok(CURRENT_HOURS),
    setWindowHours: async (hours) => (writes.push(hours), ok(undefined)),
    ...overrides,
  }
  const recordAuditEvent: RecordAuditEvent = async (input) => {
    events.push(input)
    return (auditFails ? err({ code: 'AUDIT_EVENT_INVALID' }) : ok({})) as Awaited<ReturnType<RecordAuditEvent>>
  }
  return { deps: { policy, recordAuditEvent }, writes, events }
}

describe('getCancellationWindow', () => {
  it('devuelve las horas vigentes', async () => {
    const { deps } = createFakes()

    const result = await getCancellationWindow(deps.policy)()

    expect(isOk(result) && result.value).toBe(CURRENT_HOURS)
  })

  it('un fallo de la base es StorageFailed, no un valor inventado', async () => {
    const { deps } = createFakes({ getWindowHours: async () => err(storageFailed('caída')) })

    const result = await getCancellationWindow(deps.policy)()

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
  })
})

describe('changeCancellationWindow', () => {
  it('guarda la nueva ventana y deja en la bitácora quién la cambió, de cuánto a cuánto', async () => {
    const { deps, writes, events } = createFakes()

    const result = await changeCancellationWindow(deps, { actorId: ACTOR_ID, hours: 24 })

    expect(isOk(result) && result.value).toBe(24)
    expect(writes).toEqual([24])
    expect(events).toEqual([
      {
        actorId: ACTOR_ID,
        action: CANCELLATION_WINDOW_CHANGED_ACTION,
        entityType: CANCELLATION_POLICY_ENTITY_TYPE,
        entityId: CANCELLATION_POLICY_ENTITY_ID,
        payload: { previousHours: CURRENT_HOURS, newHours: 24 },
      },
    ])
  })

  it('si la cifra no cambia no escribe ni deja evento', async () => {
    const { deps, writes, events } = createFakes()

    const result = await changeCancellationWindow(deps, { actorId: ACTOR_ID, hours: CURRENT_HOURS })

    expect(isOk(result)).toBe(true)
    expect(writes).toEqual([])
    expect(events).toEqual([])
  })

  it.each([-1, 1.5, 100000])('una cifra inválida (%s) no toca la base', async (hours) => {
    const { deps, writes, events } = createFakes()

    const result = await changeCancellationWindow(deps, { actorId: ACTOR_ID, hours })

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_INVALID_CANCELLATION_WINDOW')
    expect(writes).toEqual([])
    expect(events).toEqual([])
  })

  it('si no puede leer la ventana actual no escribe', async () => {
    const { deps, writes } = createFakes({ getWindowHours: async () => err(storageFailed('caída')) })

    const result = await changeCancellationWindow(deps, { actorId: ACTOR_ID, hours: 24 })

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
    expect(writes).toEqual([])
  })

  it('si la escritura falla no deja evento', async () => {
    const failure: Result<void, StorageFailed> = err(storageFailed('sin permiso'))
    const { deps, events } = createFakes({ setWindowHours: async () => failure })

    const result = await changeCancellationWindow(deps, { actorId: ACTOR_ID, hours: 24 })

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_STORAGE_FAILED')
    expect(events).toEqual([])
  })

  it('si la bitácora falla lo dice: el cambio quedó guardado pero sin registro', async () => {
    const { deps, writes } = createFakes({}, true)

    const result = await changeCancellationWindow(deps, { actorId: ACTOR_ID, hours: 24 })

    expect(isErr(result) && result.error.code).toBe('SCHEDULING_AUDIT_NOT_RECORDED')
    expect(writes).toEqual([24])
  })
})
