import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import { CANCELLATION_POLICY_PATH, cancellationPolicyMessages } from '../constants/cancellation-policy-strings'
import { CancellationPolicyView } from '../components/CancellationPolicyView'

const copy = cancellationPolicyMessages

vi.mock('../actions/cancellation-policy-actions', () => ({
  changeCancellationWindowAction: vi.fn(),
}))

afterEach(cleanup)

describe('CancellationPolicyView', () => {
  it('con la política cargada muestra el título y el formulario con las horas vigentes', () => {
    render(<CancellationPolicyView view={{ status: 'ready', hours: 48 }} />)

    expect(screen.getByRole('heading', { level: 1, name: copy.title })).toBeTruthy()
    const input = screen.getByLabelText(copy.hoursLabel) as HTMLInputElement
    expect(input.value).toBe('48')
    expect(screen.getByRole('button', { name: copy.submit })).toBeTruthy()
  })

  it('explica qué significa la cifra vigente y la liga al campo', () => {
    render(<CancellationPolicyView view={{ status: 'ready', hours: 48 }} />)

    expect(screen.getByText(copy.hoursHint(48))).toBeTruthy()
    expect(screen.getByLabelText(copy.hoursLabel).getAttribute('aria-describedby')).toBeTruthy()
  })

  it('con cero horas dice que no hay ventana', () => {
    render(<CancellationPolicyView view={{ status: 'ready', hours: 0 }} />)

    expect(screen.getByText(copy.hoursHint(0))).toBeTruthy()
  })

  it('si falló la carga avisa con role=alert y ofrece reintentar, sin formulario (UI-003)', () => {
    render(<CancellationPolicyView view={{ status: 'error' }} />)

    expect(screen.getByRole('alert').textContent).toContain(copy.loadFailed)
    expect(screen.getByRole('link', { name: copy.reload }).getAttribute('href')).toBe(CANCELLATION_POLICY_PATH)
    expect(screen.queryByLabelText(copy.hoursLabel)).toBeNull()
  })
})
