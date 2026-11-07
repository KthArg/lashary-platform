import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { confirmationPolicyMessages } from '../constants/confirmation-policy-strings'
import { ConfirmationPolicyForm } from '../components/ConfirmationPolicyForm'
import type { ConfirmationPolicyActionState } from '../types/confirmation-policy.types'

const copy = confirmationPolicyMessages
const mockAction = vi.fn<(previous: ConfirmationPolicyActionState, formData: FormData) => Promise<ConfirmationPolicyActionState>>()

vi.mock('../actions/confirmation-policy-actions', () => ({
  changeConfirmationDeadlineAction: (previous: ConfirmationPolicyActionState, formData: FormData) =>
    mockAction(previous, formData),
}))

beforeEach(() => mockAction.mockReset())
afterEach(cleanup)

const submitWith = (hours: string) => {
  fireEvent.change(screen.getByLabelText(copy.hoursLabel), { target: { value: hours } })
  fireEvent.click(screen.getByRole('button', { name: copy.submit }))
}

describe('ConfirmationPolicyForm', () => {
  it('al guardar manda las horas escritas y avisa cómo quedó el plazo con role=status', async () => {
    mockAction.mockResolvedValue({ status: 'ok', message: copy.saved(24) })
    render(<ConfirmationPolicyForm hours={48} />)
    submitWith('24')

    expect((await screen.findByRole('status')).textContent).toBe(copy.saved(24))
    expect(mockAction.mock.calls[0][1].get('hours')).toBe('24')
  })

  it.each(['invalid', 'failed'] as const)('con el estado %s avisa con role=alert', async (status) => {
    mockAction.mockResolvedValue({ status, message: 'No se pudo.' })
    render(<ConfirmationPolicyForm hours={48} />)
    submitWith('24')

    expect((await screen.findByRole('alert')).textContent).toContain('No se pudo.')
  })

  it('mientras guarda deshabilita el botón y lo dice', async () => {
    let finish: (state: ConfirmationPolicyActionState) => void = () => {}
    mockAction.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    render(<ConfirmationPolicyForm hours={48} />)
    submitWith('24')

    const saving = (await screen.findByRole('button', { name: copy.saving })) as HTMLButtonElement
    expect(saving.disabled).toBe(true)
    finish({ status: 'ok', message: copy.saved(24) })
    await waitFor(() => expect(screen.getByRole('status')).toBeTruthy())
  })

  it('sin enviar nada no hay ningún aviso', () => {
    render(<ConfirmationPolicyForm hours={48} />)

    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
