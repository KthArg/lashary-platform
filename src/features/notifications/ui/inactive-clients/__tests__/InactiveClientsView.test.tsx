import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { formatStudioDate } from '@/shared/studio-time'
import type { InactiveClient } from '@/features/notifications/domain/inactive-reminder'
import { inactiveClientsMessages as copy } from '../constants/inactive-clients-strings'
import { InactiveClientsView } from '../components/InactiveClientsView'
import { inactiveClientsUrl } from '../utils/inactive-clients-url'

afterEach(cleanup)

const VISIT = new Date('2026-05-10T16:00:00Z')
const SENT = new Date('2026-09-01T15:00:00Z')

const CLIENTS: InactiveClient[] = [
  { clientId: 'c1', fullName: 'Ana Rodríguez', lastVisitAt: null, optedOut: false, lastReminder: null },
  {
    clientId: 'c2',
    fullName: 'María Solís',
    lastVisitAt: VISIT,
    optedOut: true,
    lastReminder: { status: 'sent', queuedAt: SENT, sentAt: SENT },
  },
]

const ready = (overrides: Partial<{ total: number; page: number; clients: InactiveClient[] }> = {}) => ({
  status: 'ready' as const,
  view: {
    rangeDays: 90 as const,
    since: new Date('2026-08-24T15:00:00Z'),
    page: overrides.page ?? 1,
    pageSize: 20,
    total: overrides.total ?? 2,
    clients: overrides.clients ?? CLIENTS,
  },
})

describe('InactiveClientsView', () => {
  it('muestra el filtro de rango con 90 días elegido y la lista con nombre, última visita y último recordatorio (criterios 1 y 3)', () => {
    render(<InactiveClientsView screen={ready()} />)

    expect(screen.getByRole('heading', { level: 1, name: copy.title })).toBeTruthy()
    const range = screen.getByLabelText(copy.rangeLabel) as HTMLSelectElement
    expect(range.value).toBe('90')
    expect(Array.from(range.options).map((option) => option.value)).toEqual(['30', '60', '90', '180'])

    const rows = screen.getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByText('Ana Rodríguez')).toBeTruthy()
    expect(within(rows[0]).getByText(copy.neverVisited)).toBeTruthy()
    expect(within(rows[0]).getByText(copy.noReminder)).toBeTruthy()
    expect(within(rows[1]).getByText(formatStudioDate(VISIT))).toBeTruthy()
    expect(within(rows[1]).getByText(copy.reminder.sent(formatStudioDate(SENT)))).toBeTruthy()
    expect(within(rows[1]).getByText(copy.optedOut)).toBeTruthy()
    expect(screen.getByText(copy.total(2))).toBeTruthy()
  })

  it('sin clientas inactivas lo dice y sugiere un rango más corto (UI-003)', () => {
    render(<InactiveClientsView screen={ready({ total: 0, clients: [] })} />)

    expect(screen.getByText(copy.empty)).toBeTruthy()
    expect(screen.getByRole('link', { name: copy.emptyAction }).getAttribute('href')).toBe(
      inactiveClientsUrl({ rangeDays: 30, page: 1 }),
    )
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('si falló la carga avisa con role=alert y ofrece reintentar con el mismo rango (UI-003)', () => {
    render(<InactiveClientsView screen={{ status: 'error', rangeDays: 180, page: 2 }} />)

    expect(screen.getByRole('alert').textContent).toContain(copy.loadFailed)
    expect(screen.getByRole('link', { name: copy.reload }).getAttribute('href')).toBe(
      inactiveClientsUrl({ rangeDays: 180, page: 2 }),
    )
    expect((screen.getByLabelText(copy.rangeLabel) as HTMLSelectElement).value).toBe('180')
  })

  it('pagina con enlaces que conservan el rango y solo enlaza páginas que existen', () => {
    render(<InactiveClientsView screen={ready({ total: 45, page: 2 })} />)

    const nav = screen.getByRole('navigation', { name: copy.pagination.label })
    expect(within(nav).getByText(copy.pagination.page(2, 3))).toBeTruthy()
    expect(within(nav).getByRole('link', { name: copy.pagination.previous }).getAttribute('href')).toBe(
      inactiveClientsUrl({ rangeDays: 90, page: 1 }),
    )
    expect(within(nav).getByRole('link', { name: copy.pagination.next }).getAttribute('href')).toBe(
      inactiveClientsUrl({ rangeDays: 90, page: 3 }),
    )
  })

  it('en la última página no ofrece siguiente, y con una sola página no muestra paginación', () => {
    const { unmount } = render(<InactiveClientsView screen={ready({ total: 45, page: 3 })} />)
    expect(screen.queryByRole('link', { name: copy.pagination.next })).toBeNull()
    unmount()

    render(<InactiveClientsView screen={ready()} />)
    expect(screen.queryByRole('navigation', { name: copy.pagination.label })).toBeNull()
  })
})
