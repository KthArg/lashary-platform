import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ClientsList, CLIENTS_ARIA_LABELS, CLIENTS_BUTTON_TEXTS, CLIENTS_ERROR_MESSAGES, CLIENTS_LABELS, CLIENTS_TABLE_HEADERS, CLIENTS_TABLE_TEXTS } from '@/features/clients'
import { CLIENT_FIXTURES } from './client-fixtures'

const mockRefresh = vi.fn()
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: mockRefresh }) }))

/** US-CLI-05 criterio 2 — un lapiz distinguible por clienta (UI-004) y estados vacio, carga y error (UI-003). */
describe('ClientsList', () => {
  it('da a cada clienta un boton de editar con nombre propio y el icono oculto al lector', () => {
    render(<ClientsList clients={CLIENT_FIXTURES} />)
    for (const client of CLIENT_FIXTURES) {
      const button = screen.getByRole('button', { name: CLIENTS_ARIA_LABELS.editClient(client.fullName) })
      expect(button.textContent).toBe('')
      expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    }
  })

  /** US-CLI-01 criterio 1: nombre y contacto en columnas con nombre propio (UI-004). */
  it('muestra a cada clienta en una fila con nombre, telefono y correo', () => {
    render(<ClientsList clients={CLIENT_FIXTURES} />)
    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent)
    expect(headers).toEqual([
      CLIENTS_TABLE_HEADERS.fullName, CLIENTS_TABLE_HEADERS.phone, CLIENTS_TABLE_HEADERS.email,
      CLIENTS_TABLE_HEADERS.delinquencyStatus, CLIENTS_TABLE_HEADERS.lastAppointment, CLIENTS_TABLE_HEADERS.actions,
    ])
    // Una fila por clienta, mas la del encabezado.
    expect(screen.getAllByRole('row')).toHaveLength(CLIENT_FIXTURES.length + 1)
    for (const client of CLIENT_FIXTURES) {
      const row = screen.getByRole('row', { name: new RegExp(client.fullName) })
      // Tantas celdas como columnas: si falta una, los datos se corren de columna.
      expect(row.querySelectorAll('th, td')).toHaveLength(Object.keys(CLIENTS_TABLE_HEADERS).length)
      expect(row.textContent).toContain(client.phone)
      expect(row.textContent).toContain(client.email)
    }
  })

  /** Criterios diferidos: la columna existe, el dato no. En blanco se leeria como "no debe nada" (EST-005). */
  it('marca morosidad y ultima cita como sin dato mientras US-MOR-01 y US-AGE-05 no existan', () => {
    render(<ClientsList clients={CLIENT_FIXTURES} />)
    expect(screen.getAllByText(CLIENTS_TABLE_TEXTS.pendingColumnValue)).toHaveLength(CLIENT_FIXTURES.length * 2)
  })

  it('muestra el estado vacio cuando no hay clientas', () => {
    render(<ClientsList clients={[]} />)
    expect(screen.getByText(CLIENTS_LABELS.clientsListEmpty)).toBeTruthy()
  })

  /** US-CLI-01 criterio 4: sin coincidencias con filtro no es lo mismo que sin clientas (UI-003). */
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
