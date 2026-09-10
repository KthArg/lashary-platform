import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClientsList, CLIENTS_ARIA_LABELS, CLIENTS_ERROR_MESSAGES, CLIENTS_LABELS } from '@/features/clients'
import { TEST_CLIENTS } from './fixtures/clients'

/**
 * US-CLI-05 criterio 2 — la lista es el punto de entrada a la edicion: sin ella no hay
 * "cliente existente" que editar. Cubre que cada clienta trae su propia accion de editar
 * distinguible (UI-004) y el estado vacio (UI-003).
 */
describe('ClientsList', () => {
  it('muestra una fila por clienta con su nombre', () => {
    render(<ClientsList clients={TEST_CLIENTS} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(TEST_CLIENTS.length)
    for (const client of TEST_CLIENTS) {
      expect(screen.getByText(client.fullName)).toBeTruthy()
    }
  })

  it('da a cada boton de editar un nombre accesible propio', () => {
    render(<ClientsList clients={TEST_CLIENTS} />)
    for (const client of TEST_CLIENTS) {
      expect(screen.getByRole('button', { name: CLIENTS_ARIA_LABELS.editClient(client.fullName) })).toBeTruthy()
    }
  })

  it('oculta el icono al lector de pantalla, que solo debe oir el nombre del boton', () => {
    render(<ClientsList clients={TEST_CLIENTS} />)
    const [button] = screen.getAllByRole('button')
    expect(button.textContent).toBe('')
    expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
  })

  it('muestra el estado vacio cuando no hay clientas', () => {
    render(<ClientsList clients={[]} />)
    expect(screen.getByText(CLIENTS_LABELS.clientsListEmpty)).toBeTruthy()
    expect(screen.queryByRole('listitem')).toBeNull()
  })
  it('muestra el estado de error y no el vacio cuando la lectura falla (UI-003)', () => {
    render(<ClientsList clients={[]} error={CLIENTS_ERROR_MESSAGES.clientsListLoadFailed} />)
    expect(screen.getByRole('alert').textContent).toBe(CLIENTS_ERROR_MESSAGES.clientsListLoadFailed)
    // Sin esto, un fallo de la base se leeria como 'el estudio no tiene clientas', que es mentira.
    expect(screen.queryByText(CLIENTS_LABELS.clientsListEmpty)).toBeNull()
  })
})
