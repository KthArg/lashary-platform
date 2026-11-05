import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CLOSE_ERROR_MESSAGES } from '@/features/scheduling/db/appointment-closing-repository.constants'
import { DAILY_AGENDA_PATH } from '../constants/daily-agenda-strings'
import { closeAppointmentMessages } from '../constants/close-appointment.constants'
import { closeAppointmentAction } from '../actions/close-appointment-actions'

const APPOINTMENT_ID = '3f1c6a52-8d4e-4b1a-9c2f-5a7e1d0b9c11'
const DELIVERED_TECHNIQUE_ID = '9b2d4c10-7e3f-4a58-8f6d-1c0a2b3d4e5f'

let rpcResult: { data: unknown; error: { message: string } | null }
const mockRpc = vi.fn(async () => rpcResult)
const mockRequireAdmin = vi.fn()
const mockRevalidate = vi.fn()

vi.mock('@/shared/lib/supabase/server', () => ({ createClient: vi.fn(async () => ({ rpc: mockRpc })) }))
vi.mock('@/features/auth', () => ({ requireAdminSession: () => mockRequireAdmin() }))
vi.mock('next/cache', () => ({ revalidatePath: (path: string) => mockRevalidate(path) }))

beforeEach(() => {
  vi.clearAllMocks()
  mockRequireAdmin.mockResolvedValue({ user: { id: 'admin-1' } })
  rpcResult = {
    data: [
      {
        appointment_id: APPOINTMENT_ID,
        outcome: 'completed',
        charge_amount: 35000,
        deposit_credit: 10000,
        amount_due: 25000,
        forfeited_deposit: 0,
      },
    ],
    error: null,
  }
})

describe('closeAppointmentAction', () => {
  it('exige sesión de administradora antes de tocar la base', async () => {
    mockRequireAdmin.mockRejectedValueOnce(new Error('sin sesión'))

    await expect(closeAppointmentAction({ appointmentId: APPOINTMENT_ID, outcome: 'completed' })).rejects.toThrow()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('cierra la cita, devuelve los montos y refresca la agenda', async () => {
    const result = await closeAppointmentAction({ appointmentId: APPOINTMENT_ID, outcome: 'completed' })

    expect(result).toEqual({
      ok: true,
      closing: {
        appointmentId: APPOINTMENT_ID,
        outcome: 'completed',
        chargeAmount: 35000,
        depositCredit: 10000,
        amountDue: 25000,
        forfeitedDeposit: 0,
      },
    })
    expect(mockRevalidate).toHaveBeenCalledWith(DAILY_AGENDA_PATH)
  })

  it('manda el servicio prestado cuando difiere del reservado', async () => {
    await closeAppointmentAction({
      appointmentId: APPOINTMENT_ID,
      outcome: 'completed',
      deliveredTechniqueId: DELIVERED_TECHNIQUE_ID,
    })

    expect(mockRpc).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ p_delivered_technique_id: DELIVERED_TECHNIQUE_ID }),
    )
  })

  it.each([
    ['sin cita', { outcome: 'completed' }],
    ['con una cita que no es un id', { appointmentId: 'no-es-un-id', outcome: 'completed' }],
    ['con un resultado desconocido', { appointmentId: APPOINTMENT_ID, outcome: 'cancelled' }],
    ['con un servicio prestado que no es un id', { appointmentId: APPOINTMENT_ID, outcome: 'completed', deliveredTechniqueId: 'x' }],
    ['con un valor que no es un objeto', 'cerrar'],
  ])('rechaza la petición %s sin llamar a la base', async (_description, input) => {
    const result = await closeAppointmentAction(input)

    expect(result).toEqual({ ok: false, error: closeAppointmentMessages.invalidRequest })
    expect(mockRpc).not.toHaveBeenCalled()
    expect(mockRevalidate).not.toHaveBeenCalled()
  })

  it.each([
    [CLOSE_ERROR_MESSAGES.notClosable, closeAppointmentMessages.notClosable],
    [CLOSE_ERROR_MESSAGES.notChargeable, closeAppointmentMessages.notChargeable],
    [CLOSE_ERROR_MESSAGES.techniqueNotAvailable, closeAppointmentMessages.techniqueNotAvailable],
    ['connection reset', closeAppointmentMessages.failed],
  ])('si la base responde "%s", devuelve un mensaje para la administradora y no refresca', async (message, expected) => {
    rpcResult = { data: null, error: { message } }

    const result = await closeAppointmentAction({ appointmentId: APPOINTMENT_ID, outcome: 'no_show' })

    expect(result).toEqual({ ok: false, error: expected })
    expect(mockRevalidate).not.toHaveBeenCalled()
  })
})
