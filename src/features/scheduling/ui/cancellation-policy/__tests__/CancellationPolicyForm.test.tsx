import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { cancellationPolicyMessages } from '../constants/cancellation-policy-strings'
import { CancellationPolicyForm } from '../components/CancellationPolicyForm'
import type { CancellationPolicyActionState } from '../types/cancellation-policy.types'

const copy = cancellationPolicyMessages
const mockAction = vi.fn<(previous: CancellationPolicyActionState, formData: FormData) => Promise<CancellationPolicyActionState>>()

vi.mock('../actions/cancellation-policy-actions', () => ({
  changeCancellationWindowAction: (previous: CancellationPolicyActionState, formData: FormData) =>
    mockAction(previous, formData),
}))

beforeEach(() => mockAction.mockReset())
afterEach(cleanup)

const submitWith = (hours: string) => {
  fireEvent.change(screen.getByLabelText(copy.hoursLabel), { target: { value: hours } })
  fireEvent.click(screen.getByRole('button', { name: copy.submit }))
}

describe('CancellationPolicyForm', () => {
  it('al guardar manda las horas escritas y avisa cómo quedó la ventana con role=status', async () => {
    mockAction.mockResolvedValue({ status: 'ok', message: copy.saved(24) })
    render(<CancellationPolicyForm hours={48} />)
    submitWith('24')

    expect((await screen.findByRole('status')).textContent).toBe(copy.saved(24))
    expect(mockAction.mock.calls[0][1].get('hours')).toBe('24')
  })

  it.each(['invalid', 'failed', 'forbidden'] as const)('con el estado %s avisa con role=alert', async (status) => {
    mockAction.mockResolvedValue({ status, message: 'No se pudo.' })
    render(<CancellationPolicyForm hours={48} />)
    submitWith('24')

    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo.')
  })

  it('si se guardó pero la bitácora falló lo dice como advertencia', async () => {
    mockAction.mockResolvedValue({ status: 'warning', message: copy.savedWithoutAudit })
    render(<CancellationPolicyForm hours={48} />)
    submitWith('24')

    expect((await screen.findByRole('alert')).textContent).toContain(copy.savedWithoutAudit)
  })

  it('mientras guarda deshabilita el botón y lo dice', async () => {
    let finish: (state: CancellationPolicyActionState) => void = () => {}
    mockAction.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    render(<CancellationPolicyForm hours={48} />)
    submitWith('24')

    const saving = (await screen.findByRole('button', { name: copy.saving })) as HTMLButtonElement
    expect(saving.disabled).toBe(true)
    finish({ status: 'ok', message: copy.saved(24) })
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
  })

  it('sin enviar nada no hay ningún aviso', () => {
    render(<CancellationPolicyForm hours={48} />)

    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
