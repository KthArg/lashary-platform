import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { err, ok } from '@/shared/result'
import { storageFailed } from '@/features/scheduling/domain/errors'
import type { AgendaEntry } from '@/features/scheduling/domain/daily-agenda'
import { DailyAgendaView } from '../components/DailyAgendaView'
import { dailyAgendaMessages as COPY } from '../constants/daily-agenda-strings'
import { toDailyAgendaViewModel } from '../utils/daily-agenda-format'
import type { ClientLinks } from '../types/daily-agenda.types'

afterEach(cleanup)

const DATE = '2027-03-10'
const TODAY = '2027-03-08'

const clientLinks: ClientLinks = (clientId) => ({
  record: `/admin/clients/${clientId}/expediente`,
  appointments: `/admin/clients/${clientId}/citas`,
})

const entry = (overrides: Partial<AgendaEntry>): AgendaEntry => ({
  id: 'cita-1',
  status: 'confirmed',
  startsAtMs: Date.parse('2027-03-10T15:00:00Z'),
  endsAtMs: Date.parse('2027-03-10T16:00:00Z'),
  durationMin: 60,
  clientId: 'perfil-ana',
  clientName: 'Ana Mora',
  techniqueName: 'Clásicas',
  isFirstTime: true,
  paymentStatus: 'covered',
  ...overrides,
})

const renderAgenda = (entries: AgendaEntry[], isTruncated = false) =>
  render(
    <DailyAgendaView
      view={toDailyAgendaViewModel({ date: DATE, today: TODAY, agenda: ok({ date: DATE, entries, isTruncated }), clientLinks })}
    />,
  )

describe('DailyAgendaView — US-AGE-11', () => {
  it('lista las citas del día en el orden recibido, con hora, clienta, técnica, duración, primera vez y pago (criterios 1 y 2)', () => {
    renderAgenda([
      entry({ id: 'cita-1', clientName: 'Ana Mora' }),
      entry({ id: 'cita-2', clientId: 'perfil-eva', clientName: 'Eva Solís', startsAtMs: Date.parse('2027-03-10T17:00:00Z'), isFirstTime: false, paymentStatus: 'unpaid' }),
    ])

    const items = within(screen.getByRole('list', { name: /citas del/i })).getAllByRole('listitem')
    expect(items.map((item) => within(item).getByText(/Ana Mora|Eva Solís/).textContent)).toEqual(['Ana Mora', 'Eva Solís'])
    expect(within(items[0]).getByText('Clásicas')).toBeTruthy()
    expect(within(items[0]).getByText('Primera vez')).toBeTruthy()
    expect(within(items[0]).getByText('60 min')).toBeTruthy()
    expect(within(items[0]).getByText(COPY.payment.covered)).toBeTruthy()
    expect(within(items[1]).getByText('Retoque')).toBeTruthy()
    expect(within(items[1]).getByText(COPY.payment.unpaid)).toBeTruthy()
  })

  it('abre el expediente y las citas de la clienta desde la misma vista, con nombre accesible (criterio 3, UI-004)', () => {
    renderAgenda([entry({})])

    const record = screen.getByRole('link', { name: 'Abrir el expediente de Ana Mora' })
    const appointments = screen.getByRole('link', { name: 'Ver las citas de Ana Mora' })
    expect(record.getAttribute('href')).toBe('/admin/clients/perfil-ana/expediente')
    expect(appointments.getAttribute('href')).toBe('/admin/clients/perfil-ana/citas')
    expect(record.textContent).toBe(COPY.openRecord)
  })

  it('una cita sin clienta no ofrece enlaces', () => {
    renderAgenda([entry({ clientId: null, clientName: null })])

    expect(screen.getByText(COPY.noClient)).toBeTruthy()
    expect(screen.queryByRole('link', { name: /expediente/i })).toBeNull()
  })

  it('una cita pendiente de aprobar se distingue con texto, no solo con color (UI-004)', () => {
    renderAgenda([entry({ status: 'pending_approval' })])

    expect(screen.getByText(COPY.status.pending_approval)).toBeTruthy()
  })

  it('una cita rechazada aparece con su estado escrito, junto a las demás del día', () => {
    renderAgenda([entry({ id: 'cita-1' }), entry({ id: 'cita-2', status: 'rejected', clientName: 'Eva Solís' })])

    const items = within(screen.getByRole('list')).getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[1]).getByText(COPY.status.rejected)).toBeTruthy()
    expect(within(items[1]).getByText('Eva Solís')).toBeTruthy()
  })

  it('si el día no cabe entero, lo avisa arriba de la lista (PERF-002)', () => {
    renderAgenda([entry({})], true)

    expect(screen.getByText(COPY.truncated(100))).toBeTruthy()
    cleanup()
    renderAgenda([entry({})])
    expect(screen.queryByText(COPY.truncated(100))).toBeNull()
  })

  it('se mueve al día anterior y al siguiente, y vuelve a hoy (criterio 4)', () => {
    renderAgenda([])

    const nav = screen.getByRole('navigation', { name: COPY.dayNavLabel })
    expect(within(nav).getByRole('link', { name: COPY.previousDay }).getAttribute('href')).toBe('/admin/citas/agenda?fecha=2027-03-09')
    expect(within(nav).getByRole('link', { name: COPY.nextDay }).getAttribute('href')).toBe('/admin/citas/agenda?fecha=2027-03-11')
    expect(within(nav).getByRole('link', { name: COPY.today }).getAttribute('href')).toBe('/admin/citas/agenda?fecha=2027-03-08')
  })

  it('sin citas muestra el estado vacío; un fallo, el error con reintentar el mismo día (UI-003)', () => {
    renderAgenda([])
    expect(screen.getByText(COPY.empty)).toBeTruthy()
    cleanup()

    render(<DailyAgendaView view={toDailyAgendaViewModel({ date: DATE, today: TODAY, agenda: err(storageFailed('caída')), clientLinks })} />)
    const alert = screen.getByRole('alert')
    expect(alert.textContent).toContain(COPY.loadError)
    expect(within(alert).getByRole('link', { name: COPY.retry }).getAttribute('href')).toBe('/admin/citas/agenda?fecha=2027-03-10')
    expect(screen.getByRole('link', { name: COPY.previousDay })).toBeTruthy()
  })
})
