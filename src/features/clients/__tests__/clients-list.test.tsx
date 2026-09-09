import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClientsList, CLIENTS_ARIA_LABELS, CLIENTS_LABELS, SAMPLE_CLIENTS } from '@/features/clients'

/**
 * US-CLI-05 criterio 2 — la lista es el punto de entrada a la edicion: sin ella no hay
 * "cliente existente" que editar. Cubre que cada clienta trae su propia accion de editar
 * distinguible (UI-004) y el estado vacio (UI-003).
 */
describe('ClientsList', () => {
  it('muestra una fila por clienta con su nombre', () => {
    render(<ClientsList clients={SAMPLE_CLIENTS} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(SAMPLE_CLIENTS.length)
    for (const client of SAMPLE_CLIENTS) {
      expect(screen.getByText(client.fullName)).toBeTruthy()
    }
  })

  it('da a cada boton de editar un nombre accesible propio', () => {
    render(<ClientsList clients={SAMPLE_CLIENTS} />)
    for (const client of SAMPLE_CLIENTS) {
      expect(screen.getByRole('button', { name: CLIENTS_ARIA_LABELS.editClient(client.fullName) })).toBeTruthy()
    }
  })

  it('muestra el estado vacio cuando no hay clientas', () => {
    render(<ClientsList clients={[]} />)
    expect(screen.getByText(CLIENTS_LABELS.clientsListEmpty)).toBeTruthy()
    expect(screen.queryByRole('listitem')).toBeNull()
  })
})
