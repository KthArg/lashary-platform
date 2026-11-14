import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react'
import { reapplicationSettingsMessages as copy } from '../constants/reapplication-settings-strings'
import { AnticipationDaysForm } from '../components/AnticipationDaysForm'
import { REAPPLICATION_ANTICIPATION_DAYS_MAX, REAPPLICATION_ANTICIPATION_DAYS_MIN } from '@/features/notifications/domain/reapplication-reminder'
import type { SetAnticipationDaysActionResult } from '../types/reapplication-settings.types'

const mockAction = vi.fn<(input: unknown) => Promise<SetAnticipationDaysActionResult>>()
const fieldLabel = copy.label(REAPPLICATION_ANTICIPATION_DAYS_MIN, REAPPLICATION_ANTICIPATION_DAYS_MAX)
const invalidMessage = copy.invalid(REAPPLICATION_ANTICIPATION_DAYS_MIN, REAPPLICATION_ANTICIPATION_DAYS_MAX)

vi.mock('../actions/reapplication-settings-actions', () => ({
  setAnticipationDaysAction: (input: unknown) => mockAction(input),
}))

beforeEach(() => mockAction.mockReset())
afterEach(cleanup)

const submitWith = (days: string) => {
  fireEvent.change(screen.getByLabelText(fieldLabel), { target: { value: days } })
  fireEvent.click(screen.getByRole('button', { name: copy.save }))
}

describe('AnticipationDaysForm', () => {
  it('al guardar manda los días escritos y avisa con role=status', async () => {
    mockAction.mockResolvedValue({ ok: true, anticipationDays: 14 })
    render(<AnticipationDaysForm anticipationDays={7} />)
    submitWith('14')

    expect((await screen.findByRole('status')).textContent).toBe(copy.saved)
    expect(mockAction).toHaveBeenCalledWith({ anticipationDays: 14 })
  })

  it('con un fallo avisa el error dentro del mismo role=status (región viva)', async () => {
    mockAction.mockResolvedValue({ ok: false, error: copy.saveFailed })
    render(<AnticipationDaysForm anticipationDays={7} />)
    submitWith('14')

    expect((await screen.findByRole('status')).textContent).toBe(copy.saveFailed)
  })

  it('mientras guarda deshabilita el botón y lo dice', async () => {
    let finish: (result: SetAnticipationDaysActionResult) => void = () => {}
    mockAction.mockReturnValue(new Promise((resolve) => (finish = resolve)))
    render(<AnticipationDaysForm anticipationDays={7} />)
    submitWith('14')

    const saving = (await screen.findByRole('button', { name: copy.saving })) as HTMLButtonElement
    expect(saving.disabled).toBe(true)
    finish({ ok: true, anticipationDays: 14 })
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(copy.saved))
  })

  it('sin enviar nada no hay ningún aviso', () => {
    render(<AnticipationDaysForm anticipationDays={7} />)

    expect(screen.getByRole('status').textContent).toBe('')
  })

  it('un campo vacío manda NaN, que la acción rechaza, sin romper el formulario', async () => {
    mockAction.mockResolvedValue({ ok: false, error: invalidMessage })
    render(<AnticipationDaysForm anticipationDays={7} />)
    submitWith('')

    expect((await screen.findByRole('status')).textContent).toBe(invalidMessage)
    expect(mockAction).toHaveBeenCalledWith({ anticipationDays: Number.NaN })
  })
})
