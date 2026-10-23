import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { moneyFromColones, formatMoney } from '@/shared/money'
import { ApprovalQueue } from '../components/ApprovalQueue'
import { APPROVAL_QUEUE_ARIA, APPROVAL_QUEUE_CHOICE, APPROVAL_QUEUE_CLIENT, APPROVAL_QUEUE_LABELS } from '../constants/approval-queue.labels'
import { APPROVAL_QUEUE_ERRORS } from '../constants/approval-queue.constants'
import { APPOINTMENT_DISPLAY_CHOICE } from '../../appointment-display/constants/appointment-display.constants'
import { formatAppointmentSlot } from '../../appointment-display/utils/format-appointment-slot'

const mockRefresh = vi.fn()
const mockApprove = vi.fn()
const mockReject = vi.fn()

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }))
vi.mock('../actions/approval-queue-actions', () => ({
  approveAppointmentAction: (appointmentId: string) => mockApprove(appointmentId),
  rejectAppointmentAction: (appointmentId: string, reason: string) => mockReject(appointmentId, reason),
}))

const FIRST_APPOINTMENT = {
  id: 'cita-1',
  startsAtMs: Date.parse('2027-03-01T16:00:00Z'),
  endsAtMs: Date.parse('2027-03-01T17:00:00Z'),
  clientName: 'Ana Mora',
  choice: {
    techniqueName: 'Clásicas',
    isFirstTime: true,
    detectedFirstTime: true,
    servicePrice: 35000,
    depositRequired: 10000,
  },
}
const SECOND_APPOINTMENT = {
  id: 'cita-2',
  startsAtMs: Date.parse('2027-03-02T16:00:00Z'),
  endsAtMs: Date.parse('2027-03-02T17:00:00Z'),
  clientName: null,
  choice: null,
}
const FIRST_SLOT = formatAppointmentSlot(FIRST_APPOINTMENT.startsAtMs, FIRST_APPOINTMENT.endsAtMs)
const REJECTION_REASON = 'horario no disponible'

beforeEach(() => {
  vi.clearAllMocks()
  mockApprove.mockResolvedValue({ ok: true })
  mockReject.mockResolvedValue({ ok: true })
})

describe('formatAppointmentSlot', () => {
  it('muestra el día y la hora local del estudio, no la hora UTC', () => {
    expect(FIRST_SLOT).toContain('marzo')
    expect(FIRST_SLOT).toContain('10:00')
  })
})

describe('ApprovalQueue: estados (UI-003)', () => {
  it('cargando: avisa con role status', () => {
    render(<ApprovalQueue appointments={[]} isLoading />)

    expect(screen.getByRole('status').textContent).toBe(APPROVAL_QUEUE_LABELS.loading)
  })

  it('error: muestra el mensaje con role alert y permite reintentar', () => {
    render(<ApprovalQueue appointments={[]} loadError={APPROVAL_QUEUE_ERRORS.loadFailed} />)

    expect(screen.getByRole('alert').textContent).toContain(APPROVAL_QUEUE_ERRORS.loadFailed)
    fireEvent.click(screen.getByRole('button', { name: APPROVAL_QUEUE_LABELS.retry }))
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })

  it('vacío: dice que no hay citas pendientes', () => {
    render(<ApprovalQueue appointments={[]} />)

    expect(screen.getByText(APPROVAL_QUEUE_LABELS.empty)).toBeTruthy()
  })

  it('con datos: lista cada cita pendiente con su horario y botones con nombre propio', () => {
    render(<ApprovalQueue appointments={[FIRST_APPOINTMENT, SECOND_APPOINTMENT]} />)

    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByRole('button', { name: APPROVAL_QUEUE_ARIA.approve(FIRST_SLOT) })).toBeTruthy()
    expect(screen.getByRole('button', { name: APPROVAL_QUEUE_ARIA.reject(FIRST_SLOT) })).toBeTruthy()
  })
})

describe('ApprovalQueue: de quién es la cita', () => {
  it('muestra el nombre de la clienta en cada cita para saber a quién se aprueba', () => {
    render(<ApprovalQueue appointments={[FIRST_APPOINTMENT]} />)

    expect(screen.getByText('Ana Mora')).toBeTruthy()
  })

  it('una cita sin clienta asociada lo dice en vez de dejar el espacio vacío', () => {
    render(<ApprovalQueue appointments={[SECOND_APPOINTMENT]} />)

    expect(screen.getByText(APPROVAL_QUEUE_CLIENT.noClient)).toBeTruthy()
  })
})

describe('ApprovalQueue: lo que eligió la clienta', () => {
  it('muestra el servicio, si es primera vez o retoque, el precio y el anticipo para poder detectar un error', () => {
    render(<ApprovalQueue appointments={[FIRST_APPOINTMENT]} />)

    expect(screen.getByText('Clásicas')).toBeTruthy()
    expect(screen.getByText(APPOINTMENT_DISPLAY_CHOICE.firstTime)).toBeTruthy()
    const amounts = APPOINTMENT_DISPLAY_CHOICE.priceAndDeposit(formatMoney(moneyFromColones(35000)), formatMoney(moneyFromColones(10000)))
    expect(screen.getByText((_, element) => element?.tagName === 'P' && element.textContent === amounts)).toBeTruthy()
  })

  it('marca la cita cuando eligió retoque y el sistema detectó primera vez, y no marca las que coinciden', () => {
    const retouchChosen = {
      ...FIRST_APPOINTMENT,
      id: 'cita-retoque',
      choice: { ...FIRST_APPOINTMENT.choice, isFirstTime: false, servicePrice: 25000 },
    }
    render(<ApprovalQueue appointments={[FIRST_APPOINTMENT, retouchChosen]} />)

    const notes = screen.getAllByRole('note')
    expect(notes).toHaveLength(1)
    expect(notes[0].textContent).toBe(APPROVAL_QUEUE_CHOICE.chose.retouchButDetectedFirstTime)
  })

  it('una cita sin elección guardada lo dice y no inventa montos', () => {
    render(<ApprovalQueue appointments={[SECOND_APPOINTMENT]} />)

    expect(screen.getByText(APPOINTMENT_DISPLAY_CHOICE.noService)).toBeTruthy()
    expect(screen.queryByText(/Precio/)).toBeNull()
  })
})

describe('ApprovalQueue: decisiones', () => {
  it('aprobar llama a la acción con el id de esa cita', async () => {
    render(<ApprovalQueue appointments={[FIRST_APPOINTMENT, SECOND_APPOINTMENT]} />)

    fireEvent.click(screen.getByRole('button', { name: APPROVAL_QUEUE_ARIA.approve(FIRST_SLOT) }))

    await waitFor(() => expect(mockApprove).toHaveBeenCalledWith(FIRST_APPOINTMENT.id))
  })

  it('rechazar pide el motivo opcional y llama a la acción con el id y el motivo', async () => {
    render(<ApprovalQueue appointments={[FIRST_APPOINTMENT]} />)

    fireEvent.click(screen.getByRole('button', { name: APPROVAL_QUEUE_ARIA.reject(FIRST_SLOT) }))
    fireEvent.change(screen.getByLabelText(APPROVAL_QUEUE_LABELS.reasonLabel), { target: { value: REJECTION_REASON } })
    fireEvent.click(screen.getByRole('button', { name: APPROVAL_QUEUE_LABELS.confirmReject }))

    await waitFor(() => expect(mockReject).toHaveBeenCalledWith(FIRST_APPOINTMENT.id, REJECTION_REASON))
  })

  it('cancelar el rechazo cierra el formulario sin llamar a la acción', () => {
    render(<ApprovalQueue appointments={[FIRST_APPOINTMENT]} />)

    fireEvent.click(screen.getByRole('button', { name: APPROVAL_QUEUE_ARIA.reject(FIRST_SLOT) }))
    fireEvent.click(screen.getByRole('button', { name: APPROVAL_QUEUE_LABELS.cancelReject }))

    expect(screen.queryByLabelText(APPROVAL_QUEUE_LABELS.reasonLabel)).toBeNull()
    expect(mockReject).not.toHaveBeenCalled()
  })

  it('si la acción falla muestra el mensaje con role alert y deja la cita en la lista', async () => {
    mockApprove.mockResolvedValue({ ok: false, error: APPROVAL_QUEUE_ERRORS.notPending })
    render(<ApprovalQueue appointments={[FIRST_APPOINTMENT]} />)

    fireEvent.click(screen.getByRole('button', { name: APPROVAL_QUEUE_ARIA.approve(FIRST_SLOT) }))

    expect((await screen.findByRole('alert')).textContent).toBe(APPROVAL_QUEUE_ERRORS.notPending)
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })
})
