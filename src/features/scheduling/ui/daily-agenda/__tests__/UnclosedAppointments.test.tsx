import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor, within } from '@testing-library/react'
import { err, ok } from '@/shared/result'
import { formatMoney, moneyFromColones } from '@/shared/money'
import { storageFailed } from '@/features/scheduling/domain/errors'
import { UNCLOSED_APPOINTMENTS_LIMIT } from '@/features/scheduling/domain/appointment-closing.constants'
import type { UnclosedAppointment } from '@/features/scheduling/application/closing-ports'
import { DailyAgendaView } from '../components/DailyAgendaView'
import { closeAppointmentMessages } from '../constants/close-appointment.constants'
import { dailyAgendaMessages as COPY } from '../constants/daily-agenda-strings'
import { toDailyAgendaViewModel, toUnclosedSectionView } from '../utils/daily-agenda-format'
import type { ClientLinks } from '../types/daily-agenda.types'

const mockCloseAppointment = vi.fn()
vi.mock('../actions/close-appointment-actions', () => ({
  closeAppointmentAction: (input: unknown) => mockCloseAppointment(input),
}))

beforeEach(() => mockCloseAppointment.mockReset())
afterEach(cleanup)

const DATE = '2027-03-10'
const TODAY = '2027-03-10'
const NOW_MS = Date.parse('2027-03-10T18:00:00Z')
const SERVICE_PRICE = 15000
const DEPOSIT = 5000

const clientLinks: ClientLinks = (clientId) => ({
  record: `/admin/clients/${clientId}/expediente`,
  appointments: `/admin/clients/${clientId}/citas`,
})

const money = (colones: number): string => formatMoney(moneyFromColones(colones))

const normalized = (text: string): string => text.replace(/\s+/g, ' ')

const unclosed = (overrides: Partial<UnclosedAppointment>): UnclosedAppointment => ({
  id: 'cita-1',
  status: 'approved',
  startsAtMs: Date.parse('2027-03-08T16:00:00Z'),
  endsAtMs: Date.parse('2027-03-08T17:00:00Z'),
  clientId: 'perfil-ana',
  clientName: 'Ana Mora',
  techniqueId: 'tecnica-1',
  isFirstTime: true,
  techniqueName: 'Clásicas',
  servicePrice: SERVICE_PRICE,
  depositRegistered: DEPOSIT,
  ...overrides,
})

const services = [{ id: 'tecnica-2', name: 'Henna', priceFirstTime: 20000, priceRetouch: null }]

const sectionOf = (appointments: UnclosedAppointment[], isTruncated = false) =>
  toUnclosedSectionView(ok({ appointments, isTruncated }), NOW_MS, services)

const renderAgenda = (section: ReturnType<typeof toUnclosedSectionView>) =>
  render(
    <DailyAgendaView
      view={toDailyAgendaViewModel({
        date: DATE,
        today: TODAY,
        agenda: ok({ date: DATE, entries: [], isTruncated: false, isDelinquencyUnavailable: false }),
        clientLinks,
      })}
      unclosed={section}
    />,
  )

describe('citas pasadas sin cerrar — US-AGE-12 criterio 5', () => {
  it('no muestra la sección si no hay citas sin cerrar', () => {
    expect(toUnclosedSectionView(ok({ appointments: [], isTruncated: false }), NOW_MS)).toBeNull()

    renderAgenda(null)

    expect(screen.queryByRole('region', { name: COPY.unclosed.title })).toBeNull()
  })

  it('destaca cada cita pasada sin cerrar con su día, hora, clienta y técnica, y enlaza al día de la cita', () => {
    renderAgenda(sectionOf([unclosed({}), unclosed({ id: 'cita-2', clientId: null, clientName: null, techniqueName: null })]))

    const section = screen.getByRole('region', { name: COPY.unclosed.title })
    const items = within(section).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText(/Ana Mora/)).toBeTruthy()
    expect(within(items[0]).getByText(/Clásicas/)).toBeTruthy()
    expect(within(items[0]).getByText(/lunes, 8 de marzo de 2027/i)).toBeTruthy()
    const link = within(items[0]).getByRole('link', { name: /Ir al día de la cita de Ana Mora/ })
    expect(link.getAttribute('href')).toBe('/admin/citas/agenda?fecha=2027-03-08')
    expect(within(items[1]).getByText(new RegExp(COPY.noClient))).toBeTruthy()
  })

  it('avisa cuando hay más citas sin cerrar de las que caben', () => {
    renderAgenda(sectionOf([unclosed({})], true))

    expect(screen.getByText(COPY.unclosed.truncated(UNCLOSED_APPOINTMENTS_LIMIT))).toBeTruthy()
  })

  it('si no se pudo comprobar, lo dice en lugar de callar', () => {
    renderAgenda(toUnclosedSectionView(err(storageFailed('caída')), NOW_MS))

    expect(screen.getByRole('alert').textContent).toBe(COPY.unclosed.loadError)
  })
})

describe('cerrar la cita desde la agenda — US-AGE-12 criterios 1, 3, 4 y 7', () => {
  const openCloseOptions = () => fireEvent.click(screen.getByRole('button', { name: /Cerrar la cita de Ana Mora/ }))

  it('antes de confirmar muestra lo que se cobra y se descuenta al atenderla, y lo que se pierde en una ausencia', () => {
    renderAgenda(sectionOf([unclosed({})]))

    openCloseOptions()

    const completedSummary = COPY.close.completedSummary(money(SERVICE_PRICE), money(DEPOSIT), money(SERVICE_PRICE - DEPOSIT))
    expect(screen.getByText(normalized(completedSummary))).toBeTruthy()
    expect(screen.getByText(normalized(COPY.close.noShowSummary(money(DEPOSIT))))).toBeTruthy()
  })

  it('una cita sin clienta ni precio solo se puede cerrar como ausencia', () => {
    renderAgenda(sectionOf([unclosed({ clientId: null, clientName: null, servicePrice: null, depositRegistered: 0 })]))

    fireEvent.click(screen.getByRole('button', { name: /Cerrar la cita de/ }))

    expect(screen.queryByLabelText(new RegExp(COPY.close.completedLabel))).toBeNull()
    expect(screen.getByText(COPY.close.noShowWithoutDeposit)).toBeTruthy()
  })

  it('confirma la opción elegida y avisa cómo quedó el cierre', async () => {
    mockCloseAppointment.mockResolvedValue({
      ok: true,
      closing: {
        appointmentId: 'cita-1',
        outcome: 'completed',
        chargeAmount: SERVICE_PRICE,
        depositCredit: DEPOSIT,
        amountDue: SERVICE_PRICE - DEPOSIT,
        forfeitedDeposit: 0,
      },
    })
    renderAgenda(sectionOf([unclosed({})]))
    openCloseOptions()

    fireEvent.click(screen.getByRole('button', { name: COPY.close.confirm }))

    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
    expect(mockCloseAppointment).toHaveBeenCalledWith({ appointmentId: 'cita-1', outcome: 'completed' })
    expect(normalized(screen.getByRole('status').textContent ?? '')).toContain(normalized(money(SERVICE_PRICE - DEPOSIT)))
  })

  it('cierra como ausencia cuando la administradora elige esa opción', async () => {
    mockCloseAppointment.mockResolvedValue({
      ok: true,
      closing: { appointmentId: 'cita-1', outcome: 'no_show', chargeAmount: 0, depositCredit: 0, amountDue: 0, forfeitedDeposit: DEPOSIT },
    })
    renderAgenda(sectionOf([unclosed({})]))
    openCloseOptions()

    fireEvent.click(screen.getByLabelText(new RegExp(COPY.close.noShowLabel.slice(0, 11))))
    fireEvent.click(screen.getByRole('button', { name: COPY.close.confirm }))

    await waitFor(() => expect(mockCloseAppointment).toHaveBeenCalledWith({ appointmentId: 'cita-1', outcome: 'no_show' }))
    await waitFor(() => expect(normalized(screen.getByRole('status').textContent ?? '')).toContain(normalized(money(DEPOSIT))))
  })

  it('si la base rechaza el cierre, muestra el motivo y deja volver a intentar', async () => {
    mockCloseAppointment.mockResolvedValue({ ok: false, error: closeAppointmentMessages.notClosable })
    renderAgenda(sectionOf([unclosed({})]))
    openCloseOptions()

    fireEvent.click(screen.getByRole('button', { name: COPY.close.confirm }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(closeAppointmentMessages.notClosable))
    expect(screen.getByRole('button', { name: /Cerrar la cita de Ana Mora/ })).toBeTruthy()
  })

  it('si la acción se interrumpe sin dar una respuesta, muestra el mensaje general', async () => {
    mockCloseAppointment.mockResolvedValue(undefined)
    renderAgenda(sectionOf([unclosed({})]))
    openCloseOptions()

    fireEvent.click(screen.getByRole('button', { name: COPY.close.confirm }))

    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe(closeAppointmentMessages.failed))
  })

  it('«Volver» cancela sin llamar a la acción', () => {
    renderAgenda(sectionOf([unclosed({})]))
    openCloseOptions()

    fireEvent.click(screen.getByRole('button', { name: COPY.close.back }))

    expect(mockCloseAppointment).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: /Cerrar la cita de Ana Mora/ })).toBeTruthy()
  })

  it('al elegir otro servicio prestado cambia el aviso y se manda ese servicio al confirmar', async () => {
    mockCloseAppointment.mockResolvedValue({
      ok: true,
      closing: { appointmentId: 'cita-1', outcome: 'completed', chargeAmount: 20000, depositCredit: DEPOSIT, amountDue: 15000, forfeitedDeposit: 0 },
    })
    renderAgenda(sectionOf([unclosed({})]))
    openCloseOptions()

    fireEvent.change(screen.getByLabelText(COPY.close.serviceLabel), { target: { value: 'tecnica-2' } })

    expect(screen.getByText(normalized(COPY.close.completedSummary(money(20000), money(DEPOSIT), money(20000 - DEPOSIT))))).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: COPY.close.confirm }))
    await waitFor(() =>
      expect(mockCloseAppointment).toHaveBeenCalledWith({
        appointmentId: 'cita-1',
        outcome: 'completed',
        deliveredTechniqueId: 'tecnica-2',
      }),
    )
  })

  it('al cerrar como ausencia no manda el servicio prestado aunque se haya elegido otro', async () => {
    mockCloseAppointment.mockResolvedValue({
      ok: true,
      closing: { appointmentId: 'cita-1', outcome: 'no_show', chargeAmount: 0, depositCredit: 0, amountDue: 0, forfeitedDeposit: DEPOSIT },
    })
    renderAgenda(sectionOf([unclosed({})]))
    openCloseOptions()
    fireEvent.change(screen.getByLabelText(COPY.close.serviceLabel), { target: { value: 'tecnica-2' } })

    fireEvent.click(screen.getByLabelText(new RegExp(COPY.close.noShowLabel.slice(0, 11))))
    fireEvent.click(screen.getByRole('button', { name: COPY.close.confirm }))

    await waitFor(() => expect(mockCloseAppointment).toHaveBeenCalledWith({ appointmentId: 'cita-1', outcome: 'no_show' }))
  })
})
