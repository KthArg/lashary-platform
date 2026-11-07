import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ClientsList, CLIENTS_ARIA_LABELS, CLIENTS_BUTTON_TEXTS, CLIENTS_ERROR_MESSAGES, CLIENTS_LABELS, CLIENTS_TABLE_HEADERS, CLIENTS_TABLE_TEXTS, clientAppointmentsPath, clientRecordPath } from '@/features/clients'
import { CLIENT_LIST_FIXTURES as CLIENT_FIXTURES } from '../../../__tests__/client-fixtures'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }))

describe('ClientsList', () => {
  it('da a cada clienta un boton de editar con nombre propio y el icono oculto al lector', () => {
    render(<ClientsList clients={CLIENT_FIXTURES} />)
    for (const client of CLIENT_FIXTURES) {
      const button = screen.getByRole('button', { name: CLIENTS_ARIA_LABELS.editClient(client.fullName) })
      expect(button.textContent).toBe('')
      expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    }
  })

  it('da a cada clienta un enlace a su expediente con nombre propio', () => {
    render(<ClientsList clients={CLIENT_FIXTURES} />)
    for (const client of CLIENT_FIXTURES) {
      const link = screen.getByRole('link', { name: CLIENTS_ARIA_LABELS.openRecord(client.fullName) })
      expect(link.getAttribute('href')).toBe(clientRecordPath(client.id))
      expect(link.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    }
  })

  it('da a cada clienta un enlace a su historial de citas con nombre propio', () => {
    render(<ClientsList clients={CLIENT_FIXTURES} />)
    for (const client of CLIENT_FIXTURES) {
      const link = screen.getByRole('link', { name: CLIENTS_ARIA_LABELS.openAppointments(client.fullName) })
      expect(link.getAttribute('href')).toBe(clientAppointmentsPath(client.id))
      expect(link.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    }
  })

  it('muestra a cada clienta en una fila con nombre, telefono y correo', () => {
    render(<ClientsList clients={CLIENT_FIXTURES} />)
    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent)
    expect(headers).toEqual([
      CLIENTS_TABLE_HEADERS.fullName, CLIENTS_TABLE_HEADERS.phone, CLIENTS_TABLE_HEADERS.email,
      CLIENTS_TABLE_HEADERS.delinquencyStatus, CLIENTS_TABLE_HEADERS.lastVisit, CLIENTS_TABLE_HEADERS.actions,
    ])
    expect(screen.getAllByRole('row')).toHaveLength(CLIENT_FIXTURES.length + 1)
    for (const client of CLIENT_FIXTURES) {
      const row = screen.getByRole('row', { name: new RegExp(client.fullName) })
      expect(row.querySelectorAll('th, td')).toHaveLength(Object.keys(CLIENTS_TABLE_HEADERS).length)
      expect(row.textContent).toContain(client.phone)
      expect(row.textContent).toContain(client.email)
    }
  })

  it('marca la morosidad como sin dato mientras US-MOR-01 no exista', () => {
    render(<ClientsList clients={CLIENT_FIXTURES} />)
    expect(screen.getAllByText(CLIENTS_TABLE_TEXTS.pendingColumnValue)).toHaveLength(CLIENT_FIXTURES.length)
  })

  it('criterio 1: muestra la ultima visita en la fecha del estudio, y "sin visitas" a quien nunca vino', () => {
    render(<ClientsList clients={CLIENT_FIXTURES} />)
    const visited = screen.getByRole('row', { name: new RegExp(CLIENT_FIXTURES[0].fullName) })
    const neverVisited = screen.getByRole('row', { name: new RegExp(CLIENT_FIXTURES[1].fullName) })
    expect(visited.textContent).toContain('30 jun 2026')
    expect(neverVisited.textContent).toContain(CLIENTS_TABLE_TEXTS.neverVisited)
  })

  it('con un filtro de fechas y sin coincidencias lo dice, en vez de decir que no hay clientas', () => {
    render(<ClientsList clients={[]} activeNameFilter="ana" hasVisitRangeFilter />)
    expect(screen.getByText(CLIENTS_LABELS.clientsListEmptyForFilters)).toBeTruthy()
    expect(screen.queryByText(CLIENTS_LABELS.clientsListEmpty)).toBeNull()
  })

  it('un rango de fechas al reves se avisa sin ofrecer Reintentar, porque reintentar no lo arregla', () => {
    render(<ClientsList clients={[]} filterError={CLIENTS_ERROR_MESSAGES.invertedVisitRange} />)
    expect(screen.getByRole('alert').textContent).toContain(CLIENTS_ERROR_MESSAGES.invertedVisitRange)
    expect(screen.queryByRole('button', { name: CLIENTS_BUTTON_TEXTS.retry })).toBeNull()
    expect(screen.queryByText(CLIENTS_LABELS.clientsListEmpty)).toBeNull()
  })

  it('muestra el estado vacio cuando no hay clientas', () => {
    render(<ClientsList clients={[]} />)
    expect(screen.getByText(CLIENTS_LABELS.clientsListEmpty)).toBeTruthy()
  })

  it('con filtro activo y sin coincidencias nombra el filtro en vez de decir que no hay clientas', () => {
    render(<ClientsList clients={[]} activeNameFilter="ana" />)
    expect(screen.getByText(CLIENTS_LABELS.clientsListEmptyForFilter('ana'))).toBeTruthy()
    expect(screen.queryByText(CLIENTS_LABELS.clientsListEmpty)).toBeNull()
  })

  it('anuncia la carga sin mostrar el estado vacio', () => {
    render(<ClientsList clients={[]} isLoading />)
    expect(screen.getByRole('status').textContent).toBe(CLIENTS_LABELS.clientsListLoading)
    expect(screen.queryByText(CLIENTS_LABELS.clientsListEmpty)).toBeNull()
  })

  it('con lectura fallida muestra el error, no "no hay clientas", y Reintentar vuelve a leer', () => {
    render(<ClientsList clients={[]} loadError={CLIENTS_ERROR_MESSAGES.loadFailed} />)
    expect(screen.getByRole('alert').textContent).toContain(CLIENTS_ERROR_MESSAGES.loadFailed)
    expect(screen.queryByText(CLIENTS_LABELS.clientsListEmpty)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: CLIENTS_BUTTON_TEXTS.retry }))
    expect(mockRefresh).toHaveBeenCalledTimes(1)
  })
})
