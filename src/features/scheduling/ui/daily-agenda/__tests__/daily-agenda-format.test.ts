import { describe, it, expect } from 'vitest'
import { err, ok } from '@/shared/result'
import { storageFailed } from '@/features/scheduling/domain/errors'
import type { AgendaEntry } from '@/features/scheduling/domain/daily-agenda'
import { buildAgendaDayNav, toDailyAgendaViewModel } from '../utils/daily-agenda-format'
import type { ClientLinks } from '../types/daily-agenda.types'

const DATE = '2027-03-10'
const TODAY = '2027-03-08'

const time = new Intl.DateTimeFormat('es-CR', { timeStyle: 'short', timeZone: 'America/Costa_Rica' })
const day = new Intl.DateTimeFormat('es-CR', { dateStyle: 'full', timeZone: 'America/Costa_Rica' })

const clientLinks: ClientLinks = (clientId) => ({
  record: `/admin/clients/${clientId}/expediente`,
  appointments: `/admin/clients/${clientId}/citas`,
})

const booked: AgendaEntry = {
  id: 'cita-1',
  status: 'pending_approval',
  startsAtMs: Date.parse('2027-03-10T15:00:00Z'),
  endsAtMs: Date.parse('2027-03-10T16:30:00Z'),
  durationMin: 90,
  clientId: 'perfil-ana',
  clientName: 'Ana Mora',
  techniqueName: 'Clásicas',
  isFirstTime: true,
  paymentStatus: 'partial',
  hasActiveDelinquency: false,
}

const studioOnly: AgendaEntry = {
  id: 'cita-2',
  status: 'confirmed',
  startsAtMs: Date.parse('2027-03-10T18:00:00Z'),
  endsAtMs: Date.parse('2027-03-10T19:00:00Z'),
  durationMin: 60,
  clientId: null,
  clientName: null,
  techniqueName: null,
  isFirstTime: null,
  paymentStatus: null,
  hasActiveDelinquency: false,
}

describe('buildAgendaDayNav — US-AGE-11 criterio 4', () => {
  it('nombra el día y enlaza al anterior, al siguiente y a hoy', () => {
    expect(buildAgendaDayNav(DATE, TODAY)).toEqual({
      dayLabel: day.format(Date.parse('2027-03-10T18:00:00Z')),
      currentHref: '/admin/citas/agenda?fecha=2027-03-10',
      previousHref: '/admin/citas/agenda?fecha=2027-03-09',
      nextHref: '/admin/citas/agenda?fecha=2027-03-11',
      todayHref: '/admin/citas/agenda?fecha=2027-03-08',
      isToday: false,
    })
    expect(buildAgendaDayNav(TODAY, TODAY).isToday).toBe(true)
  })

  it('cruza el fin de mes y de año sin inventar fechas', () => {
    const nav = buildAgendaDayNav('2027-12-31', TODAY)
    expect(nav.nextHref).toBe('/admin/citas/agenda?fecha=2028-01-01')
    expect(buildAgendaDayNav('2027-03-01', TODAY).previousHref).toBe('/admin/citas/agenda?fecha=2027-02-28')
  })
})

describe('toDailyAgendaViewModel — US-AGE-11', () => {
  it('deja cada cita lista para pintar: hora, clienta, técnica, duración, pago, primera vez y estado (criterios 1 y 2)', () => {
    const view = toDailyAgendaViewModel({ date: DATE, today: TODAY, agenda: ok({ date: DATE, entries: [booked], isTruncated: false }), clientLinks })

    expect(view.status === 'ready' && view.entries).toEqual([
      {
        id: 'cita-1',
        time: `${time.format(booked.startsAtMs)} – ${time.format(booked.endsAtMs)}`,
        duration: '90 min',
        clientName: 'Ana Mora',
        technique: 'Clásicas',
        visit: 'Primera vez',
        delinquency: null,
        payment: 'Anticipo parcial',
        status: 'Pendiente de aprobar',
        isPending: true,
        isRejected: false,
        links: {
          record: '/admin/clients/perfil-ana/expediente',
          appointments: '/admin/clients/perfil-ana/citas',
          recordLabel: 'Abrir el expediente de Ana Mora',
          appointmentsLabel: 'Ver las citas de Ana Mora',
        },
      },
    ])
  })

  it('una cita del estudio sin clienta ni snapshot no inventa datos ni enlaces (criterio 3)', () => {
    const view = toDailyAgendaViewModel({ date: DATE, today: TODAY, agenda: ok({ date: DATE, entries: [studioOnly], isTruncated: false }), clientLinks })
    const [entry] = view.status === 'ready' ? view.entries : []

    expect(entry).toMatchObject({
      clientName: 'Sin clienta asignada',
      technique: 'Servicio no registrado',
      visit: null,
      payment: 'Sin datos de pago',
      status: 'Confirmada',
      isPending: false,
      isRejected: false,
      links: null,
    })
  })

  it('una clienta con morosidad activa lo dice en su cita (criterio 2)', () => {
    const view = toDailyAgendaViewModel({
      date: DATE,
      today: TODAY,
      agenda: ok({ date: DATE, entries: [{ ...booked, hasActiveDelinquency: true }, studioOnly], isTruncated: false }),
      clientLinks,
    })
    expect(view.status === 'ready' && view.entries.map((entry) => entry.delinquency)).toEqual(['Morosidad activa', null])
  })

  it('una cita rechazada se marca como tal y conserva los enlaces de su clienta', () => {
    const view = toDailyAgendaViewModel({
      date: DATE,
      today: TODAY,
      agenda: ok({ date: DATE, entries: [{ ...booked, status: 'rejected' }], isTruncated: false }),
      clientLinks,
    })
    const [entry] = view.status === 'ready' ? view.entries : []

    expect(entry).toMatchObject({ status: 'Rechazada', payment: 'No aplica: cita rechazada', isPending: false, isRejected: true })
    expect(entry?.links?.record).toBe('/admin/clients/perfil-ana/expediente')
  })

  it('una clienta sin nombre en el contrato sigue enlazando a su expediente', () => {
    const view = toDailyAgendaViewModel({
      date: DATE,
      today: TODAY,
      agenda: ok({ date: DATE, entries: [{ ...booked, clientName: null, isFirstTime: false }], isTruncated: false }),
      clientLinks,
    })
    const [entry] = view.status === 'ready' ? view.entries : []

    expect(entry.clientName).toBe('Clienta sin nombre')
    expect(entry.visit).toBe('Retoque')
    expect(entry.links?.record).toBe('/admin/clients/perfil-ana/expediente')
  })

  it('sin citas es el estado vacío y un fallo es el estado de error, los dos con la navegación del día (UI-003)', () => {
    const empty = toDailyAgendaViewModel({ date: DATE, today: TODAY, agenda: ok({ date: DATE, entries: [], isTruncated: false }), clientLinks })
    const failed = toDailyAgendaViewModel({ date: DATE, today: TODAY, agenda: err(storageFailed('caída')), clientLinks })

    expect(empty.status).toBe('empty')
    expect(failed.status).toBe('error')
    expect(failed.nav.previousHref).toBe('/admin/citas/agenda?fecha=2027-03-09')
  })

  it('si el día no cabe entero, avisa cuántas muestra en vez de cortar callada (PERF-002)', () => {
    const agendaOf = (isTruncated: boolean) =>
      toDailyAgendaViewModel({ date: DATE, today: TODAY, agenda: ok({ date: DATE, entries: [booked], isTruncated }), clientLinks })

    expect(agendaOf(false)).toMatchObject({ status: 'ready', truncatedNotice: null })
    expect(agendaOf(true)).toMatchObject({
      status: 'ready',
      truncatedNotice: 'Este día tiene más de 100 citas: la agenda muestra las primeras 100.',
    })
  })
})
