import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { schedulingMessages } from '../../messages'
import { toWeeklyDays } from '../utils/availability-format'

vi.mock('../actions/availability-actions', () => ({
  addWeeklyBlockAction: vi.fn(),
  removeWeeklyBlockAction: vi.fn(),
  addClosedDateAction: vi.fn(),
  removeClosedDateAction: vi.fn(),
  addManualBlockAction: vi.fn(),
}))

import { AdminAvailabilityView } from '../components/AdminAvailabilityView'

afterEach(cleanup)

const availabilityMessages = schedulingMessages.availability
const emptyWeek = toWeeklyDays([])

describe('AdminAvailabilityView — US-AGE-01', () => {
  it('sin datos: las tres listas muestran su estado vacío (UI-003) y los formularios siguen', () => {
    render(<AdminAvailabilityView weeklyDays={emptyWeek} closedDates={[]} manualBlocks={[]} />)

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
    render(<AdminAvailabilityView weeklyDays={weeklyDays} closedDates={[]} manualBlocks={[]} />)

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
    render(
      <AdminAvailabilityView
        weeklyDays={emptyWeek}
        closedDates={[{ id: 'c', date: 'viernes, 25 de diciembre de 2026', kind: 'Feriado', label: 'Navidad' }]}
        manualBlocks={[]}
      />,
    )

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
    render(
      <AdminAvailabilityView
        weeklyDays={emptyWeek}
        closedDates={[]}
        manualBlocks={[{ id: 'm', date: 'martes, 20 de octubre', range: '09:00–11:00', reason: 'banco' }]}
      />,
    )

    const blocks = screen.getByRole('region', { name: availabilityMessages.blocks.title })
    expect(within(blocks).getByText('martes, 20 de octubre · 09:00–11:00')).toBeTruthy()
    expect(within(blocks).getByText('banco')).toBeTruthy()
  })

  it('UI-004: cada campo de los formularios tiene label', () => {
    render(<AdminAvailabilityView weeklyDays={emptyWeek} closedDates={[]} manualBlocks={[]} />)

    for (const label of [availabilityMessages.weekly.weekdayLabel, availabilityMessages.closed.kindLabel, availabilityMessages.closed.labelLabel, availabilityMessages.blocks.reasonLabel]) {
      expect(screen.getByLabelText(label)).toBeTruthy()
    }
    expect(screen.getAllByLabelText(availabilityMessages.weekly.startLabel)).toHaveLength(2)
    expect(screen.getAllByLabelText(availabilityMessages.closed.dateLabel)).toHaveLength(2)
  })
})
