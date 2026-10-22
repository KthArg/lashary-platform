import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within, fireEvent } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { schedulingMessages } from '../../messages'
import { toSlotPickerView, toWeeklyDays } from '../utils/availability-format'

vi.mock('../actions/availability-actions', () => ({
  addWeeklyBlockAction: vi.fn(),
  removeWeeklyBlockAction: vi.fn(),
  addClosedDateAction: vi.fn(),
  removeClosedDateAction: vi.fn(),
  addManualBlockAction: vi.fn(),
  blockSlotsAction: vi.fn(),
  releaseManualBlockAction: vi.fn(),
  removeManualBlockAction: vi.fn(),
}))
vi.mock('next/form', () => ({ default: (props: ComponentProps<'form'>) => <form {...props} /> }))

import { AdminAvailabilityView } from '../components/AdminAvailabilityView'

afterEach(cleanup)

const availabilityMessages = schedulingMessages.availability
const emptyWeek = toWeeklyDays([])
const dayWithoutSlots = toSlotPickerView('2026-10-19', [])

const renderView = (overrides: Partial<ComponentProps<typeof AdminAvailabilityView>> = {}) =>
  render(
    <AdminAvailabilityView
      weeklyDays={emptyWeek}
      closedDates={[]}
      manualBlocks={[]}
      slotPicker={dayWithoutSlots}
      {...overrides}
    />,
  )

describe('AdminAvailabilityView — US-AGE-01', () => {
  it('sin datos: las tres listas muestran su estado vacío (UI-003) y los formularios siguen', () => {
    renderView()

    expect(screen.getByText(availabilityMessages.weekly.empty)).toBeTruthy()
    expect(screen.getByText(availabilityMessages.closed.empty)).toBeTruthy()
    expect(screen.getByText(availabilityMessages.blocks.empty)).toBeTruthy()
    expect(screen.getByRole('button', { name: availabilityMessages.weekly.submit })).toBeTruthy()
    expect(screen.getByRole('button', { name: availabilityMessages.closed.submit })).toBeTruthy()
    expect(screen.getByRole('button', { name: availabilityMessages.blocks.submit })).toBeTruthy()
  })

  it('criterio 1: el horario semanal muestra cada día con sus bloques y un botón para quitarlos', () => {
    const weeklyDays = toWeeklyDays([
      { id: 'a', resourceId: 'r', weekday: 1, startMin: 540, endMin: 720 },
      { id: 'b', resourceId: 'r', weekday: 1, startMin: 780, endMin: 1020 },
    ])
    renderView({ weeklyDays })

    const weekly = screen.getByRole('region', { name: availabilityMessages.weekly.title })
    expect(within(weekly).getByText('09:00–12:00')).toBeTruthy()
    expect(within(weekly).getByText('13:00–17:00')).toBeTruthy()
    expect(within(weekly).getAllByText(availabilityMessages.weekly.noBlocks)).toHaveLength(6)
    const remove = within(weekly).getByRole('button', {
      name: availabilityMessages.weekly.removeLabel('Lunes', '09:00–12:00'),
    })
    expect(remove.textContent).toBe(availabilityMessages.remove)
    expect(remove.getAttribute('aria-label')).toContain(availabilityMessages.remove)
  })

  it('criterio 2: los días cerrados muestran fecha, tipo y nombre, con botón para reabrir', () => {
    renderView({
      closedDates: [{ id: 'c', date: 'viernes, 25 de diciembre de 2026', kind: 'Feriado', label: 'Navidad' }],
    })

    const closed = screen.getByRole('region', { name: availabilityMessages.closed.title })
    expect(within(closed).getByText('Feriado · Navidad')).toBeTruthy()
    const reopen = within(closed).getByRole('button', {
      name: availabilityMessages.closed.removeLabel('viernes, 25 de diciembre de 2026'),
    })
    // WCAG 2.5.3: el texto visible ("Reabrir") está contenido en el nombre accesible.
    expect(reopen.textContent).toBe(availabilityMessages.closed.reopen)
    expect(reopen.getAttribute('aria-label')).toContain(availabilityMessages.closed.reopen)
  })

  it('criterio 3: los espacios bloqueados muestran fecha, horario y motivo', () => {
    renderView({
      manualBlocks: [
        { id: 'm', date: 'martes, 20 de octubre', range: '09:00–11:00', reason: 'banco', endsAtIso: '2026-10-20T17:00:00.000Z', releaseEnds: [] },
      ],
    })

    const blocks = screen.getByRole('region', { name: availabilityMessages.blocks.title })
    expect(within(blocks).getByText('martes, 20 de octubre · 09:00–11:00')).toBeTruthy()
    expect(within(blocks).getByText('banco')).toBeTruthy()
  })

  it('UI-004: cada campo de los formularios tiene label', () => {
    renderView()

    for (const label of [availabilityMessages.weekly.weekdayLabel, availabilityMessages.closed.kindLabel, availabilityMessages.closed.labelLabel, availabilityMessages.blocks.reasonLabel, availabilityMessages.picker.dayLabel]) {
      expect(screen.getByLabelText(label)).toBeTruthy()
    }
    expect(screen.getAllByLabelText(availabilityMessages.weekly.startLabel)).toHaveLength(2)
    expect(screen.getAllByLabelText(availabilityMessages.closed.dateLabel)).toHaveLength(2)
  })
})

describe('AdminAvailabilityView — US-AGE-07', () => {
  it('criterio 3: cada espacio bloqueado tiene su botón para desbloquear', () => {
    renderView({
      manualBlocks: [
        { id: 'b-1', date: 'lunes, 19 de octubre', range: '09:00–10:00', reason: null, endsAtIso: '2026-10-19T16:00:00.000Z', releaseEnds: [] },
      ],
    })

    const blocks = screen.getByRole('region', { name: availabilityMessages.blocks.title })
    const unblock = within(blocks).getByRole('button', {
      name: availabilityMessages.blocks.unblockLabel('lunes, 19 de octubre', '09:00–10:00'),
    })
    expect(unblock.textContent).toBe(availabilityMessages.blocks.unblock)
    expect(unblock.getAttribute('aria-label')).toContain(availabilityMessages.blocks.unblock)
  })

  describe('criterio 3: liberar el final de un bloqueo con un deslizador', () => {
    const threeHourBlock = {
      id: 'b-3h',
      date: 'lunes, 19 de octubre',
      range: '08:00–11:00',
      reason: null,
      endsAtIso: '2026-10-19T17:00:00.000Z',
      releaseEnds: ['10:30', '10:00', '09:30', '09:00', '08:30'],
    }
    const releaseMessages = availabilityMessages.blocks.release

    it('se elige con un deslizador de pasos enteros, no se escribe', () => {
      renderView({ manualBlocks: [threeHourBlock] })
      const slider = screen.getByLabelText(releaseMessages.sliderLabel) as HTMLInputElement

      expect(slider.type).toBe('range')
      expect([slider.min, slider.max, slider.step, slider.value]).toEqual(['1', '5', '1', '1'])
      expect(slider.name).toBe('steps')
    })

    it('cada paso dice la hora en que quedaría el bloqueo, también para lectores de pantalla (UI-004)', () => {
      renderView({ manualBlocks: [threeHourBlock] })
      const slider = screen.getByLabelText(releaseMessages.sliderLabel) as HTMLInputElement
      expect(slider.getAttribute('aria-valuetext')).toBe(releaseMessages.until('10:30'))

      fireEvent.change(slider, { target: { value: '3' } })
      expect(slider.getAttribute('aria-valuetext')).toBe(releaseMessages.until('09:30'))
      expect(screen.getByText(releaseMessages.until('09:30'))).toBeTruthy()
    })

    it('el formulario manda el bloqueo y el fin que se vio, y el botón nombra el bloqueo', () => {
      const { container } = renderView({ manualBlocks: [threeHourBlock] })

      expect((container.querySelector('input[type="hidden"][name="id"][value="b-3h"]') as HTMLInputElement)).toBeTruthy()
      expect(
        (container.querySelector('input[type="hidden"][name="expectedEndsAt"]') as HTMLInputElement).value,
      ).toBe('2026-10-19T17:00:00.000Z')
      const submit = screen.getByRole('button', {
        name: releaseMessages.buttonLabel('lunes, 19 de octubre', '08:00–11:00'),
      })
      expect(submit.textContent).toBe(releaseMessages.submit)
      expect(submit.getAttribute('aria-label')).toContain(releaseMessages.submit)
    })

    it('un bloqueo de un solo espacio no ofrece deslizador: solo se desbloquea', () => {
      renderView({
        manualBlocks: [{ ...threeHourBlock, range: '08:00–08:30', releaseEnds: [] }],
      })
      expect(screen.queryByLabelText(releaseMessages.sliderLabel)).toBeNull()
      expect(screen.getByRole('button', { name: /Desbloquear/ })).toBeTruthy()
    })
  })

  it('el selector de espacios tiene su sección y el día elegido viaja en el selector de día', () => {
    renderView()

    const picker = screen.getByRole('region', { name: availabilityMessages.picker.title })
    expect((within(picker).getByLabelText(availabilityMessages.picker.dayLabel) as HTMLInputElement).value).toBe(
      '2026-10-19',
    )
    expect(within(picker).getByText(availabilityMessages.picker.noSlots)).toBeTruthy()
  })
})
