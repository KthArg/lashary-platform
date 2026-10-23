import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { cancellationMessages } from '../constants/cancellation-strings'
import { CancelAppointment } from '../components/CancelAppointment'
import type { CancelAppointmentResult, QuoteCancellationResult } from '../types/cancellation-results'

const APPOINTMENT_ID = '00000000-0000-0000-0000-00000000ca01'
const SLOT = 'martes, 12 de abril de 2044 · 9:00 a. m. – 10:00 a. m.'
const copy = cancellationMessages

const mockQuote = vi.fn<(appointmentId: string) => Promise<QuoteCancellationResult>>()
const FORFEITED_DEPOSIT = 10000
const mockCancel = vi.fn<(appointmentId: string, expectedForfeitedDeposit: number) => Promise<CancelAppointmentResult>>()

vi.mock('../actions/cancel-appointment-actions', () => ({
  quoteCancellationAction: (appointmentId: string) => mockQuote(appointmentId),
  cancelAppointmentAction: (appointmentId: string, expectedForfeitedDeposit: number) =>
    mockCancel(appointmentId, expectedForfeitedDeposit),
}))

beforeEach(() => {
  mockQuote.mockReset()
  mockCancel.mockReset()
})
afterEach(cleanup)

const quoted = (consequence: string, losesDeposit: boolean): QuoteCancellationResult => ({
  ok: true,
  quote: { appointmentId: APPOINTMENT_ID, consequence, losesDeposit, forfeitedDeposit: losesDeposit ? FORFEITED_DEPOSIT : 0 },
})
const startButton = () => screen.getByRole('button', { name: copy.cancelButtonLabel(SLOT) })
const renderButton = (onCancelled = vi.fn()) => {
  render(<CancelAppointment appointmentId={APPOINTMENT_ID} slot={SLOT} onCancelled={onCancelled} />)
  return onCancelled
}
const openConfirmation = async (consequence: string = copy.withinWindow, losesDeposit = false) => {
  mockQuote.mockResolvedValue(quoted(consequence, losesDeposit))
  fireEvent.click(startButton())
  await screen.findByText(copy.confirmQuestion)
}

describe('CancelAppointment', () => {
  it('al principio solo ofrece cancelar, con el horario de la cita en su nombre accesible', () => {
    renderButton()

    expect(startButton().textContent).toBe(copy.cancelButton)
    expect(screen.queryByText(copy.confirmQuestion)).toBeNull()
    expect(mockQuote).not.toHaveBeenCalled()
  })

  it('al pedir cancelar consulta qué pasaría y lo muestra antes de confirmar, sin cancelar todavía (criterio 2)', async () => {
    renderButton()
    await openConfirmation(copy.outsideWindowLosesDeposit('48 horas', '₡10 000'), true)

    expect(mockQuote).toHaveBeenCalledWith(APPOINTMENT_ID)
    expect(screen.getByRole('note').textContent).toBe(copy.outsideWindowLosesDeposit('48 horas', '₡10 000'))
    expect(screen.getByRole('button', { name: copy.confirmYes })).toBeTruthy()
    expect(mockCancel).not.toHaveBeenCalled()
  })

  it('mientras calcula, el botón está deshabilitado y lo dice', async () => {
    let finishQuote: (result: QuoteCancellationResult) => void = () => {}
    mockQuote.mockReturnValue(new Promise((resolve) => (finishQuote = resolve)))
    renderButton()
    fireEvent.click(startButton())

    const waiting = await screen.findByRole('button', { name: copy.cancelButtonLabel(SLOT) })
    expect((waiting as HTMLButtonElement).disabled).toBe(true)
    expect(waiting.textContent).toBe(copy.quoting)
    finishQuote(quoted(copy.withinWindow, false))
    await screen.findByText(copy.confirmQuestion)
  })

  it('al confirmar cancela esa cita y avisa a la lista con el mensaje (criterios 3 y 6)', async () => {
    const onCancelled = renderButton()
    await openConfirmation()
    mockCancel.mockResolvedValue({ ok: true, message: copy.cancelled })
    fireEvent.click(screen.getByRole('button', { name: copy.confirmYes }))

    await waitFor(() => expect(onCancelled).toHaveBeenCalledWith(copy.cancelled))
    expect(mockCancel).toHaveBeenCalledWith(APPOINTMENT_ID, 0)
  })

  it('al confirmar manda el anticipo perdido que la clienta vio', async () => {
    renderButton()
    await openConfirmation(copy.outsideWindowLosesDeposit('48 horas', '₡10 000'), true)
    mockCancel.mockResolvedValue({ ok: true, message: copy.cancelledLosingDeposit })
    fireEvent.click(screen.getByRole('button', { name: copy.confirmYes }))

    await waitFor(() => expect(mockCancel).toHaveBeenCalledWith(APPOINTMENT_ID, FORFEITED_DEPOSIT))
  })

  it('si la consecuencia cambió, no da la cita por cancelada: muestra la nueva y pide confirmar de nuevo', async () => {
    const onCancelled = renderButton()
    await openConfirmation()
    const losing = copy.outsideWindowLosesDeposit('48 horas', '₡10 000')
    mockCancel.mockResolvedValueOnce({
      ok: false,
      message: copy.consequenceChanged,
      changedQuote: { appointmentId: APPOINTMENT_ID, consequence: losing, losesDeposit: true, forfeitedDeposit: FORFEITED_DEPOSIT },
    })
    fireEvent.click(screen.getByRole('button', { name: copy.confirmYes }))

    expect((await screen.findByRole('alert')).textContent).toContain(copy.consequenceChanged)
    expect(screen.getByRole('note').textContent).toBe(losing)
    expect(onCancelled).not.toHaveBeenCalled()

    mockCancel.mockResolvedValueOnce({ ok: true, message: copy.cancelledLosingDeposit })
    fireEvent.click(screen.getByRole('button', { name: copy.confirmYes }))
    await waitFor(() => expect(onCancelled).toHaveBeenCalledWith(copy.cancelledLosingDeposit))
    expect(mockCancel).toHaveBeenLastCalledWith(APPOINTMENT_ID, FORFEITED_DEPOSIT)
  })

  it('mientras cancela no deja volver ni confirmar otra vez', async () => {
    renderButton()
    await openConfirmation()
    mockCancel.mockReturnValue(new Promise(() => {}))
    fireEvent.click(screen.getByRole('button', { name: copy.confirmYes }))

    const confirming = await screen.findByRole('button', { name: copy.cancelling })
    expect((confirming as HTMLButtonElement).disabled).toBe(true)
    expect((screen.getByRole('button', { name: copy.confirmBack }) as HTMLButtonElement).disabled).toBe(true)
    expect(mockCancel).toHaveBeenCalledTimes(1)
  })

  it('al abrir la confirmación el foco pasa a ella, y al volver regresa al botón de cancelar', async () => {
    renderButton()
    await openConfirmation()

    expect(document.activeElement).toBe(screen.getByText(copy.confirmQuestion).parentElement)
    fireEvent.click(screen.getByRole('button', { name: copy.confirmBack }))

    expect(document.activeElement).toBe(startButton())
  })

  it('«Volver» deja la cita como estaba y no cancela nada', async () => {
    renderButton()
    await openConfirmation()
    fireEvent.click(screen.getByRole('button', { name: copy.confirmBack }))

    expect(startButton()).toBeTruthy()
    expect(screen.queryByText(copy.confirmQuestion)).toBeNull()
    expect(mockCancel).not.toHaveBeenCalled()
  })

  it('si no se pudo calcular, avisa con role=alert y deja intentar de nuevo', async () => {
    mockQuote.mockResolvedValue({ ok: false, message: copy.notCancellable })
    renderButton()
    fireEvent.click(startButton())

    expect((await screen.findByRole('alert')).textContent).toContain(copy.notCancellable)
    expect(startButton()).toBeTruthy()
  })

  it('si la cancelación falla, avisa y no la da por hecha', async () => {
    const onCancelled = renderButton()
    await openConfirmation()
    mockCancel.mockResolvedValue({ ok: false, message: copy.failed })
    fireEvent.click(screen.getByRole('button', { name: copy.confirmYes }))

    expect((await screen.findByRole('alert')).textContent).toContain(copy.failed)
    expect(onCancelled).not.toHaveBeenCalled()
    expect(startButton()).toBeTruthy()
  })

  it('si la llamada al servidor se cae, avisa con el mensaje general', async () => {
    mockQuote.mockRejectedValue(new Error('network'))
    renderButton()
    fireEvent.click(startButton())

    expect((await screen.findByRole('alert')).textContent).toContain(copy.failed)
  })
})
