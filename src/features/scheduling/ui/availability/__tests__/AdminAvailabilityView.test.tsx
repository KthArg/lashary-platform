import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
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
      manualBlocks: [{ id: 'm', date: 'martes, 20 de octubre', range: '09:00–11:00', reason: 'banco' }],
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
      manualBlocks: [{ id: 'b-1', date: 'lunes, 19 de octubre', range: '09:00–10:00', reason: null }],
    })

    const blocks = screen.getByRole('region', { name: availabilityMessages.blocks.title })
    const unblock = within(blocks).getByRole('button', {
      name: availabilityMessages.blocks.unblockLabel('lunes, 19 de octubre', '09:00–10:00'),
    })
    expect(unblock.textContent).toBe(availabilityMessages.blocks.unblock)
    expect(unblock.getAttribute('aria-label')).toContain(availabilityMessages.blocks.unblock)
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
