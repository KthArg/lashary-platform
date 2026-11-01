import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { err, ok } from '@/shared/result'
import { storageFailed } from '@/features/scheduling/domain/errors'
import { UNCLOSED_APPOINTMENTS_LIMIT } from '@/features/scheduling/domain/appointment-closing.constants'
import type { UnclosedAppointment } from '@/features/scheduling/application/closing-ports'
import { DailyAgendaView } from '../components/DailyAgendaView'
import { dailyAgendaMessages as COPY } from '../constants/daily-agenda-strings'
import { toDailyAgendaViewModel, toUnclosedSectionView } from '../utils/daily-agenda-format'
import type { ClientLinks } from '../types/daily-agenda.types'

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

const unclosed = (overrides: Partial<UnclosedAppointment>): UnclosedAppointment => ({
  id: 'cita-1',
  status: 'approved',
  startsAtMs: Date.parse('2027-03-08T16:00:00Z'),
  endsAtMs: Date.parse('2027-03-08T17:00:00Z'),
  clientId: 'perfil-ana',
  clientName: 'Ana Mora',
  techniqueId: 'tecnica-1',
  techniqueName: 'Clásicas',
  servicePrice: SERVICE_PRICE,
  depositRegistered: DEPOSIT,
  ...overrides,
})

const sectionOf = (appointments: UnclosedAppointment[], isTruncated = false) =>
  toUnclosedSectionView(ok({ appointments, isTruncated }), NOW_MS)

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
