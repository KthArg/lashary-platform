import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { ok } from '@/shared/result'
import type { AgendaEntry } from '@/features/scheduling/domain/daily-agenda'
import { DailyAgendaView } from '../components/DailyAgendaView'
import { dailyAgendaMessages as COPY } from '../constants/daily-agenda-strings'
import { toDailyAgendaViewModel, type AgendaConfirmationRule } from '../utils/daily-agenda-format'
import type { ClientLinks } from '../types/daily-agenda.types'

const DATE = '2027-03-10'
const NOW_MS = Date.parse('2027-03-09T15:00:00Z')
const CLIENT_NAME = 'Ana Mora'
const RULE: AgendaConfirmationRule = { status: 'ready', deadlineHours: 48, nowMs: NOW_MS }

const mockConfirm = vi.fn()

vi.mock('../actions/confirm-appointment-actions', () => ({
  confirmAppointmentManuallyAction: (appointmentId: string) => mockConfirm(appointmentId),
}))

beforeEach(() => {
  mockConfirm.mockReset()
})
afterEach(cleanup)

const clientLinks: ClientLinks = (clientId) => ({
  record: `/admin/clients/${clientId}/expediente`,
  appointments: `/admin/clients/${clientId}/citas`,
})

const entry = (overrides: Partial<AgendaEntry>): AgendaEntry => ({
  id: '00000000-0000-4000-8000-00000000ca01',
  status: 'approved',
  startsAtMs: Date.parse('2027-03-10T15:00:00Z'),
  endsAtMs: Date.parse('2027-03-10T16:00:00Z'),
  durationMin: 60,
  clientId: 'perfil-ana',
  clientName: CLIENT_NAME,
  techniqueName: 'Clásicas',
  isFirstTime: true,
  paymentStatus: 'covered',
  hasActiveDelinquency: false,
  ...overrides,
})

const viewOf = (entries: AgendaEntry[], confirmation: AgendaConfirmationRule) =>
  toDailyAgendaViewModel({
    date: DATE,
    today: DATE,
    agenda: ok({ date: DATE, entries, isTruncated: false, isDelinquencyUnavailable: false }),
    clientLinks,
    confirmation,
  })

const entriesOf = (entries: AgendaEntry[], confirmation: AgendaConfirmationRule = RULE) => {
  const view = viewOf(entries, confirmation)
  return view.status === 'ready' ? view.entries : []
}

describe('la agenda y la confirmación de asistencia', () => {
  it('destaca con texto una cita sin confirmar dentro del plazo (criterio 4)', () => {
    render(<DailyAgendaView view={viewOf([entry({})], RULE)} />)
    expect(screen.getByText(COPY.confirmation.unconfirmed)).toBeTruthy()
  })

  it('no destaca una cita confirmada ni una fuera del plazo', () => {
    const [confirmed] = entriesOf([entry({ status: 'confirmed' })])
    const [farAway] = entriesOf([entry({ startsAtMs: NOW_MS + 72 * 3_600_000 })])
    expect(confirmed.isUnconfirmed).toBe(false)
    expect(farAway.isUnconfirmed).toBe(false)
  })

  it('una cita aprobada con clienta se puede confirmar a mano, aunque no esté en el plazo (criterio 5)', () => {
    const [farAway] = entriesOf([entry({ startsAtMs: NOW_MS + 72 * 3_600_000 })])
    expect(farAway.confirmLabel).toBe(COPY.confirmation.registerLabel(CLIENT_NAME))
  })

  it('una cita confirmada, sin clienta o ya empezada no ofrece confirmar', () => {
    const [confirmed] = entriesOf([entry({ status: 'confirmed' })])
    const [studioOnly] = entriesOf([entry({ clientId: null })])
    const [started] = entriesOf([entry({ startsAtMs: NOW_MS - 1 })])
    expect([confirmed.confirmLabel, studioOnly.confirmLabel, started.confirmLabel]).toEqual([null, null, null])
  })

  it('si no se pudo leer el plazo lo dice, en vez de dar por confirmadas las citas', () => {
    const view = viewOf([entry({})], { status: 'unavailable', nowMs: NOW_MS })
    expect(view.status === 'ready' && view.confirmationNotice).toBe(COPY.confirmation.deadlineUnavailable)
  })

  it('registrar la confirmación pide un segundo paso y no llama la acción hasta aceptarlo', async () => {
    mockConfirm.mockResolvedValue({ ok: true })
    render(<DailyAgendaView view={viewOf([entry({})], RULE)} />)

    fireEvent.click(screen.getByRole('button', { name: COPY.confirmation.registerLabel(CLIENT_NAME) }))
    expect(screen.getByText(COPY.confirmation.irreversibleWarning)).toBeTruthy()
    expect(mockConfirm).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: COPY.confirmation.confirm }))

    await waitFor(() => expect(mockConfirm).toHaveBeenCalledWith('00000000-0000-4000-8000-00000000ca01'))
  })

  it('volver cancela el registro sin llamar la acción', () => {
    render(<DailyAgendaView view={viewOf([entry({})], RULE)} />)

    fireEvent.click(screen.getByRole('button', { name: COPY.confirmation.registerLabel(CLIENT_NAME) }))
    fireEvent.click(screen.getByRole('button', { name: COPY.confirmation.back }))

    expect(mockConfirm).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: COPY.confirmation.registerLabel(CLIENT_NAME) })).toBeTruthy()
  })

  it('muestra el motivo si no se pudo registrar', async () => {
    mockConfirm.mockResolvedValue({ ok: false, error: COPY.confirmation.notConfirmable })
    render(<DailyAgendaView view={viewOf([entry({})], RULE)} />)

    fireEvent.click(screen.getByRole('button', { name: COPY.confirmation.registerLabel(CLIENT_NAME) }))
    fireEvent.click(screen.getByRole('button', { name: COPY.confirmation.confirm }))

    expect((await screen.findByRole('alert')).textContent).toBe(COPY.confirmation.notConfirmable)
  })
})
