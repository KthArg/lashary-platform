import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ClientsList, CLIENTS_ARIA_LABELS, CLIENTS_BUTTON_TEXTS, CLIENTS_ERROR_MESSAGES, CLIENTS_LABELS } from '@/features/clients'
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

  it('muestra el estado vacio cuando no hay clientas', () => {
    render(<ClientsList clients={[]} />)
    expect(screen.getByText(CLIENTS_LABELS.clientsListEmpty)).toBeTruthy()
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
