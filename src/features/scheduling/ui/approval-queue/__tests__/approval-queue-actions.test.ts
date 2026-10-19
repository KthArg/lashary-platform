import { describe, it, expect, vi, beforeEach } from 'vitest'
import { err, ok } from '@/shared/result'
import {
  approveAppointmentAction,
  listPendingAppointmentsAction,
  rejectAppointmentAction,
} from '../actions/approval-queue-actions'
import { APPROVAL_QUEUE_ERRORS } from '../constants/approval-queue.constants'
import {
  MAX_DECISION_REASON_LENGTH,
  PENDING_APPROVAL_STATUS,
} from '../../../domain/appointment-decision.constants'

const ADMIN_ID = 'admin-1'
const APPOINTMENT_ID = 'cita-1'
const CITAS_PATH = '/admin/citas'

let rpcResult: { data: unknown; error: unknown }
let listResult: { data: unknown; error: unknown }
const mockRpc = vi.fn(async () => rpcResult)
const mockRequireAdmin = vi.fn()
const mockRecord = vi.fn()
const mockRevalidate = vi.fn()
const mockEq = vi.fn()
const fakeDb = {
  rpc: mockRpc,
  from: () => ({
    select: () => ({
      eq: (column: string, value: string) => {
        mockEq(column, value)
        return { order: () => ({ limit: async () => listResult }) }
      },
    }),
  }),
}

vi.mock('@/shared/lib/supabase/server', () => ({ createClient: vi.fn(async () => fakeDb) }))
vi.mock('@/features/auth', () => ({
  requireAdminSession: () => mockRequireAdmin(),
  ADMIN_PORTAL_ROUTES: { citas: '/admin/citas' },
}))
vi.mock('@/features/audit', () => ({ record: (event: unknown) => mockRecord(event) }))
vi.mock('next/cache', () => ({ revalidatePath: (path: string) => mockRevalidate(path) }))

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAdmin.mockResolvedValue({ user: { id: ADMIN_ID } })
  mockRecord.mockResolvedValue(ok({}))
  rpcResult = { data: [{ id: APPOINTMENT_ID, status: 'approved' }], error: null }
  listResult = { data: [], error: null }
})

describe('listPendingAppointmentsAction', () => {
  it('devuelve las citas pendientes con los instantes en milisegundos', async () => {
    listResult = {
      data: [
        {
          id: APPOINTMENT_ID,
          starts_at: '2027-03-01T10:00:00Z',
          ends_at: '2027-03-01T11:00:00Z',
          technique_name: 'Clásicas',
          is_first_time: true,
          is_first_time_detected: true,
          service_price: 35000,
          deposit_required: 10000,
        },
      ],
      error: null,
    }

    expect(await listPendingAppointmentsAction()).toEqual({
      ok: true,
      appointments: [
        {
          id: APPOINTMENT_ID,
          startsAtMs: Date.parse('2027-03-01T10:00:00Z'),
          endsAtMs: Date.parse('2027-03-01T11:00:00Z'),
          choice: {
            techniqueName: 'Clásicas',
            isFirstTime: true,
            detectedFirstTime: true,
            servicePrice: 35000,
            depositRequired: 10000,
          },
        },
      ],
    })
  })

  it('lee solo las citas en estado pendiente de aprobación', async () => {
    await listPendingAppointmentsAction()

    expect(mockEq).toHaveBeenCalledWith('status', PENDING_APPROVAL_STATUS)
  })

  it('si la base falla devuelve un error de carga, no lanza', async () => {
    listResult = { data: null, error: { message: 'caída' } }

    expect(await listPendingAppointmentsAction()).toEqual({ ok: false, error: APPROVAL_QUEUE_ERRORS.loadFailed })
  })

  it('exige sesión de administradora antes de leer nada', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('redirect'))

    await expect(listPendingAppointmentsAction()).rejects.toThrow('redirect')
  })
})

describe('approveAppointmentAction', () => {
  it('aprueba, refresca la cola y no escribe en la bitácora', async () => {
    expect(await approveAppointmentAction(APPOINTMENT_ID)).toEqual({ ok: true })
    expect(mockRevalidate).toHaveBeenCalledWith(CITAS_PATH)
    expect(mockRecord).not.toHaveBeenCalled()
  })

  it('una cita que ya no está pendiente devuelve su mensaje y no refresca', async () => {
    rpcResult = { data: [], error: null }

    expect(await approveAppointmentAction(APPOINTMENT_ID)).toEqual({ ok: false, error: APPROVAL_QUEUE_ERRORS.notPending })
    expect(mockRevalidate).not.toHaveBeenCalled()
  })

  it('exige sesión de administradora: sin ella no llega a la base', async () => {
    mockRequireAdmin.mockRejectedValue(new Error('redirect'))

    await expect(approveAppointmentAction(APPOINTMENT_ID)).rejects.toThrow('redirect')
    expect(mockRpc).not.toHaveBeenCalled()
  })
})

describe('rejectAppointmentAction', () => {
  it('rechaza con el actor de la sesión, deja el evento en la bitácora y refresca la cola', async () => {
    rpcResult = { data: [{ id: APPOINTMENT_ID, status: 'rejected' }], error: null }

    expect(await rejectAppointmentAction(APPOINTMENT_ID, 'horario no disponible')).toEqual({ ok: true })
    expect(mockRecord).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: ADMIN_ID, entityId: APPOINTMENT_ID, payload: { reason: 'horario no disponible' } }),
    )
    expect(mockRevalidate).toHaveBeenCalledWith(CITAS_PATH)
  })

  it('un motivo demasiado largo se rechaza sin tocar la base', async () => {
    const result = await rejectAppointmentAction(APPOINTMENT_ID, 'x'.repeat(MAX_DECISION_REASON_LENGTH + 1))

    expect(result).toEqual({ ok: false, error: APPROVAL_QUEUE_ERRORS.reasonTooLong })
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('si la bitácora falla avisa que la cita sí quedó rechazada y refresca la cola', async () => {
    rpcResult = { data: [{ id: APPOINTMENT_ID, status: 'rejected' }], error: null }
    mockRecord.mockResolvedValue(err(new Error('bitácora caída')))

    expect(await rejectAppointmentAction(APPOINTMENT_ID)).toEqual({ ok: false, error: APPROVAL_QUEUE_ERRORS.auditFailed })
    expect(mockRevalidate).toHaveBeenCalledWith(CITAS_PATH)
  })

  it('un error inesperado de la base devuelve el mensaje genérico', async () => {
    rpcResult = { data: null, error: { message: 'caída' } }

    expect(await rejectAppointmentAction(APPOINTMENT_ID)).toEqual({ ok: false, error: APPROVAL_QUEUE_ERRORS.decisionFailed })
    expect(mockRecord).not.toHaveBeenCalled()
  })
})
