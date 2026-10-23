import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react'
import { schedulingMessages } from '../../messages'
import { toSlotPickerView } from '../utils/availability-format'

vi.mock('../actions/availability-actions', () => ({
  addWeeklyBlockAction: vi.fn(),
  removeWeeklyBlockAction: vi.fn(),
  addClosedDateAction: vi.fn(),
  removeClosedDateAction: vi.fn(),
  addManualBlockAction: vi.fn(),
  blockSlotsAction: vi.fn(),
  removeManualBlockAction: vi.fn(),
}))

import { SlotPicker } from '../components/SlotPicker'
import { blockSlotsAction } from '../actions/availability-actions'

afterEach(cleanup)

const pickerMessages = schedulingMessages.availability.picker
const mondayPicker = toSlotPickerView('2026-10-19', [
  { startMin: 540, endMin: 570, status: 'free' },
  { startMin: 570, endMin: 600, status: 'busy' },
  { startMin: 600, endMin: 630, status: 'free' },
])

describe('SlotPicker — US-AGE-07', () => {
  it('criterio 1: cada espacio es un checkbox del mismo campo; se pueden marcar varios a la vez', () => {
    render(<SlotPicker picker={mondayPicker} />)
    const slotGroup = screen.getByRole('group', { name: pickerMessages.slotsLegend('lunes, 19 de octubre de 2026') })
    const checkboxes = within(slotGroup).getAllByRole('checkbox') as HTMLInputElement[]

    expect(checkboxes.map((checkbox) => [checkbox.value, checkbox.disabled])).toEqual([
      ['540', false],
      ['570', true],
      ['600', false],
    ])
    expect(checkboxes.every((checkbox) => checkbox.name === 'slot')).toBe(true)
    fireEvent.click(checkboxes[0])
    fireEvent.click(checkboxes[2])
    expect(checkboxes.filter((checkbox) => checkbox.checked)).toHaveLength(2)
    expect(screen.getByRole('button', { name: pickerMessages.submit })).toBeTruthy()
  })

  it('criterio 4 y UI-004: lo libre y lo ocupado lo dicen con texto, y lo ocupado no se puede marcar', () => {
    render(<SlotPicker picker={mondayPicker} />)
    const freeSlot = screen.getByRole('checkbox', { name: new RegExp(`09:00–09:30.*${pickerMessages.free}`) })
    const busySlot = screen.getByRole('checkbox', { name: new RegExp(`09:30–10:00.*${pickerMessages.busy}`) })
    expect((freeSlot as HTMLInputElement).disabled).toBe(false)
    expect((busySlot as HTMLInputElement).disabled).toBe(true)
  })

  it('el día elegido viaja en el formulario y el motivo tiene label', () => {
    const { container } = render(<SlotPicker picker={mondayPicker} />)
    const hiddenDate = container.querySelector('input[type="hidden"][name="date"]') as HTMLInputElement
    expect(hiddenDate.value).toBe('2026-10-19')
    expect(screen.getByLabelText(pickerMessages.reasonLabel)).toBeTruthy()
  })

  it('al guardar muestra el resultado de la acción', async () => {
    vi.mocked(blockSlotsAction).mockResolvedValue({ status: 'ok', message: pickerMessages.savedOk })
    render(<SlotPicker picker={mondayPicker} />)
    fireEvent.click(screen.getByRole('checkbox', { name: /09:00–09:30/ }))
    fireEvent.click(screen.getByRole('button', { name: pickerMessages.submit }))
    expect((await screen.findByRole('status')).textContent).toBe(pickerMessages.savedOk)
  })

  it('un día sin horario muestra su estado vacío (UI-003) y no ofrece guardar', () => {
    render(<SlotPicker picker={toSlotPickerView('2026-10-20', [])} />)
    expect(screen.getByText(pickerMessages.noSlots)).toBeTruthy()
    expect(screen.queryByRole('button', { name: pickerMessages.submit })).toBeNull()
  })
})
