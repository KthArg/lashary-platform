import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { schedulingMessages } from '../../messages'
import { CONFIRM_FIELD, CONFIRM_VALUE } from '../constants/confirm-reduction.constants'
import type { AvailabilityActionState } from '../types/availability-action-state'

const mockClosedDate = vi.fn<(previous: AvailabilityActionState, formData: FormData) => Promise<AvailabilityActionState>>()

vi.mock('../actions/availability-actions', () => ({
  addWeeklyBlockAction: vi.fn(),
  removeWeeklyBlockAction: vi.fn(),
  addClosedDateAction: (previous: AvailabilityActionState, formData: FormData) => mockClosedDate(previous, formData),
  removeClosedDateAction: vi.fn(),
  addManualBlockAction: vi.fn(),
}))

import { ClosedDateForm } from '../components/AvailabilityForms'

const availabilityMessages = schedulingMessages.availability

beforeEach(() => mockClosedDate.mockReset())
afterEach(cleanup)

const needsConfirmation: AvailabilityActionState = {
  status: 'needsConfirmation',
  message: availabilityMessages.affected.warning(2),
  affected: 2,
  fields: { date: '2026-12-25', kind: 'holiday', label: 'Navidad' },
}

describe('confirmación al reducir la disponibilidad — criterio 9', () => {
  it('muestra la advertencia y, al confirmar, reenvía los mismos datos con la confirmación', async () => {
    mockClosedDate.mockResolvedValueOnce(needsConfirmation).mockResolvedValueOnce({ status: 'ok', message: 'Día cerrado.' })
    const { container } = render(<ClosedDateForm />)
    fireEvent.change(container.querySelector('input[name="date"]')!, { target: { value: '2026-12-25' } })
    fireEvent.click(screen.getByRole('button', { name: availabilityMessages.closed.submit }))

    expect((await screen.findByRole('alert')).textContent).toContain('Hay 2 citas agendadas')
    fireEvent.click(screen.getByRole('button', { name: availabilityMessages.affected.confirm }))

    await waitFor(() => expect(mockClosedDate).toHaveBeenCalledTimes(2))
    const resent = Object.fromEntries(mockClosedDate.mock.calls[1][1].entries())
    expect(resent).toEqual({ date: '2026-12-25', kind: 'holiday', label: 'Navidad', [CONFIRM_FIELD]: CONFIRM_VALUE })
    expect((await screen.findByRole('status')).textContent).toBe('Día cerrado.')
  })

  it('sin advertencia no aparece ningún botón de confirmar', () => {
    render(<ClosedDateForm />)
    expect(screen.queryByRole('button', { name: availabilityMessages.affected.confirm })).toBeNull()
  })
})
