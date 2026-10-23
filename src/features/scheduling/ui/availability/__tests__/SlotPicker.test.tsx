import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, within, fireEvent, waitFor } from '@testing-library/react'
import { schedulingMessages } from '../../messages'
import { toSlotPickerView } from '../utils/availability-format'

vi.mock('../actions/availability-actions', () => ({
  addWeeklyBlockAction: vi.fn(),
  removeWeeklyBlockAction: vi.fn(),
  addClosedDateAction: vi.fn(),
  removeClosedDateAction: vi.fn(),
  addManualBlockAction: vi.fn(),
  blockSlotsAction: vi.fn(),
  releaseSlotsAction: vi.fn(),
  removeManualBlockAction: vi.fn(),
}))

import { SlotPicker } from '../components/SlotPicker'
import { blockSlotsAction, releaseSlotsAction } from '../actions/availability-actions'

beforeEach(() => vi.clearAllMocks())
afterEach(cleanup)

const pickerMessages = schedulingMessages.availability.picker
const mondayPicker = toSlotPickerView('2026-10-19', [
  { startMin: 540, endMin: 570, status: 'free' },
  { startMin: 570, endMin: 600, status: 'busy' },
  { startMin: 600, endMin: 630, status: 'blocked' },
  { startMin: 630, endMin: 660, status: 'blocked' },
  { startMin: 660, endMin: 690, status: 'free' },
  { startMin: 690, endMin: 720, status: 'free' },
])

const slotCheckbox = (range: string) => screen.getByRole('checkbox', { name: new RegExp(range) }) as HTMLInputElement
const submitButton = () => screen.getByRole('button', { name: /^(Bloquear \d+|Liberar \d+|Marcá espacios)$/ }) as HTMLButtonElement

describe('SlotPicker — US-AGE-07, criterio 1: bloquear espacios', () => {
  it('cada espacio es un checkbox del mismo campo; los que ocupa una cita no se pueden marcar', () => {
    render(<SlotPicker picker={mondayPicker} />)
    const slotGroup = screen.getByRole('group', { name: pickerMessages.slotsLegend('lunes, 19 de octubre de 2026') })
    const checkboxes = within(slotGroup).getAllByRole('checkbox') as HTMLInputElement[]

    expect(checkboxes.map((checkbox) => [checkbox.value, checkbox.disabled])).toEqual([
      ['540', false],
      ['570', true],
      ['600', false],
      ['630', false],
      ['660', false],
      ['690', false],
    ])
    expect(checkboxes.every((checkbox) => checkbox.name === 'slot')).toBe(true)
  })

  it('UI-004: libre, bloqueado y ocupado lo dicen con texto, no solo con color', () => {
    render(<SlotPicker picker={mondayPicker} />)
    expect(slotCheckbox(`09:00–09:30.*${pickerMessages.free}`)).toBeTruthy()
    expect(slotCheckbox(`09:30–10:00.*${pickerMessages.busy}`)).toBeTruthy()
    expect(slotCheckbox(`10:00–10:30.*${pickerMessages.blocked}`)).toBeTruthy()
  })

  it('se marcan espacios que no son seguidos y el botón dice cuántos se bloquean', () => {
    render(<SlotPicker picker={mondayPicker} />)
    expect(submitButton().textContent).toBe(pickerMessages.submitIdle)
    expect(submitButton().disabled).toBe(true)

    fireEvent.click(slotCheckbox('09:00–09:30'))
    fireEvent.click(slotCheckbox('11:00–11:30'))

    expect(submitButton().textContent).toBe(pickerMessages.submitBlock(2))
    expect(submitButton().disabled).toBe(false)
    expect(screen.getByLabelText(pickerMessages.reasonLabel)).toBeTruthy()
  })

  it('el día elegido viaja en el formulario', () => {
    const { container } = render(<SlotPicker picker={mondayPicker} />)
    expect((container.querySelector('input[type="hidden"][name="date"]') as HTMLInputElement).value).toBe('2026-10-19')
  })

  it('al bloquear llama a la acción de bloquear y anuncia el resultado en una región de estado', async () => {
    vi.mocked(blockSlotsAction).mockResolvedValue({ status: 'ok', message: pickerMessages.savedOk })
    render(<SlotPicker picker={mondayPicker} />)
    fireEvent.click(slotCheckbox('09:00–09:30'))
    fireEvent.click(submitButton())

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(pickerMessages.savedOk))
    expect(blockSlotsAction).toHaveBeenCalledTimes(1)
    expect(releaseSlotsAction).not.toHaveBeenCalled()
    await waitFor(() => expect(submitButton().textContent).toBe(pickerMessages.submitIdle))
  })

  it('la región de estado existe aunque no haya nada que anunciar y aunque el día no tenga espacios (UI-003)', () => {
    render(<SlotPicker picker={toSlotPickerView('2026-10-20', [])} />)
    expect(screen.getByRole('status')).toBeTruthy()
    expect(screen.getByText(pickerMessages.noSlots)).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Bloquear|Liberar|Marcá/ })).toBeNull()
  })

  it('criterio 4: si un espacio tiene una cita, avisa que hay que resolverla y enlaza a las citas', async () => {
    vi.mocked(blockSlotsAction).mockResolvedValue({
      status: 'conflict',
      message: pickerMessages.hasAppointment,
      link: { href: '/admin/citas', label: pickerMessages.goToAppointments },
    })
    render(<SlotPicker picker={mondayPicker} />)
    fireEvent.click(slotCheckbox('09:00–09:30'))
    fireEvent.click(submitButton())

    const alert = await screen.findByRole('alert')
    expect(alert.textContent).toContain(pickerMessages.hasAppointment)
    expect(within(alert).getByRole('link', { name: pickerMessages.goToAppointments }).getAttribute('href')).toBe('/admin/citas')
  })
})

describe('SlotPicker — US-AGE-07, criterio 3: liberar espacios con el mismo selector', () => {
  it('marcar un espacio bloqueado cambia el botón a liberar, con la cuenta, y oculta el motivo', () => {
    render(<SlotPicker picker={mondayPicker} />)
    fireEvent.click(slotCheckbox('10:00–10:30'))
    fireEvent.click(slotCheckbox('10:30–11:00'))

    expect(submitButton().textContent).toBe(pickerMessages.submitRelease(2))
    expect(screen.queryByLabelText(pickerMessages.reasonLabel)).toBeNull()
  })

  it('no se mezclan: al marcar un libre se deshabilitan los bloqueados, y al revés, hasta limpiar la selección', () => {
    render(<SlotPicker picker={mondayPicker} />)

    fireEvent.click(slotCheckbox('09:00–09:30'))
    expect(slotCheckbox('10:00–10:30').disabled).toBe(true)
    expect(slotCheckbox('10:30–11:00').disabled).toBe(true)
    expect(slotCheckbox('11:00–11:30').disabled).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: pickerMessages.clearSelection }))
    expect(slotCheckbox('10:00–10:30').disabled).toBe(false)
    expect(submitButton().textContent).toBe(pickerMessages.submitIdle)

    fireEvent.click(slotCheckbox('10:00–10:30'))
    expect(slotCheckbox('09:00–09:30').disabled).toBe(true)
    expect(slotCheckbox('11:00–11:30').disabled).toBe(true)
    expect(slotCheckbox('09:30–10:00').disabled).toBe(true)
  })

  it('se pueden liberar espacios que no son seguidos del mismo bloqueo o de varios', async () => {
    vi.mocked(releaseSlotsAction).mockResolvedValue({ status: 'ok', message: pickerMessages.releasedOk })
    render(<SlotPicker picker={mondayPicker} />)
    fireEvent.click(slotCheckbox('10:00–10:30'))
    fireEvent.click(slotCheckbox('10:30–11:00'))
    fireEvent.click(submitButton())

    await waitFor(() => expect(screen.getByRole('status').textContent).toBe(pickerMessages.releasedOk))
    expect(releaseSlotsAction).toHaveBeenCalledTimes(1)
    expect(blockSlotsAction).not.toHaveBeenCalled()
    const sentForm = vi.mocked(releaseSlotsAction).mock.calls[0][1]
    expect(sentForm.getAll('slot')).toEqual(['600', '630'])
    expect(sentForm.get('intent')).toBe('release')
    await waitFor(() => expect(slotCheckbox('10:00–10:30').checked).toBe(false))
  })

  it('si alguno ya estaba liberado, avisa y no deja el mensaje en una región que desaparece', async () => {
    vi.mocked(releaseSlotsAction).mockResolvedValue({ status: 'conflict', message: pickerMessages.alreadyReleased })
    render(<SlotPicker picker={mondayPicker} />)
    fireEvent.click(slotCheckbox('10:00–10:30'))
    fireEvent.click(submitButton())

    expect((await screen.findByRole('alert')).textContent).toContain(pickerMessages.alreadyReleased)
    expect(screen.getByRole('status')).toBeTruthy()
  })
})
