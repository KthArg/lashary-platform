import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClientsList, CLIENTS_ARIA_LABELS, CLIENTS_LABELS, SAMPLE_CLIENTS } from '@/features/clients'

/** US-CLI-05 criterio 2 — un lapiz distinguible por clienta (UI-004) y estado vacio (UI-003). */
describe('ClientsList', () => {
  it('da a cada clienta un boton de editar con nombre propio y el icono oculto al lector', () => {
    render(<ClientsList clients={SAMPLE_CLIENTS} />)
    for (const client of SAMPLE_CLIENTS) {
      const button = screen.getByRole('button', { name: CLIENTS_ARIA_LABELS.editClient(client.fullName) })
      expect(button.textContent).toBe('')
      expect(button.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true')
    }
  })

  it('muestra el estado vacio cuando no hay clientas', () => {
    render(<ClientsList clients={[]} />)
    expect(screen.getByText(CLIENTS_LABELS.clientsListEmpty)).toBeTruthy()
  })
})
