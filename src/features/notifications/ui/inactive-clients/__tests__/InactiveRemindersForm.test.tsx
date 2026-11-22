import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import type { InactiveClient } from '@/features/notifications/domain/inactive-reminder'
import { INACTIVE_SEND_FIELDS, inactiveSendMessages as copy } from '../constants/inactive-send-strings'
import { InactiveRemindersForm } from '../components/InactiveRemindersForm'

vi.mock('../actions/inactive-send-actions', () => ({ queueInactiveRemindersAction: vi.fn() }))

afterEach(cleanup)

const CLIENTS: InactiveClient[] = [
  { clientId: 'c1', fullName: 'Ana Rodríguez', lastVisitAt: null, optedOut: false, lastReminder: null },
  { clientId: 'c2', fullName: 'María Solís', lastVisitAt: null, optedOut: true, lastReminder: null },
  {
    clientId: 'c3',
    fullName: 'Lucía Vargas',
    lastVisitAt: null,
    optedOut: false,
    lastReminder: { status: 'pending', queuedAt: new Date('2026-11-21T15:00:00Z'), sentAt: null },
  },
]

describe('InactiveRemindersForm', () => {
  it('cada fila trae su casilla y su botón de envío individual, con nombre accesible (UI-004)', () => {
    render(<InactiveRemindersForm clients={CLIENTS} />)

    const rows = screen.getAllByRole('row').slice(1)
    const checkbox = within(rows[0]).getByRole('checkbox', { name: copy.select('Ana Rodríguez') }) as HTMLInputElement
    expect(checkbox.name).toBe(INACTIVE_SEND_FIELDS.selected)
    expect(checkbox.value).toBe('c1')
    const single = within(rows[0]).getByRole('button', { name: copy.sendOne('Ana Rodríguez') }) as HTMLButtonElement
    expect(single.name).toBe(INACTIVE_SEND_FIELDS.single)
    expect(single.value).toBe('c1')
  })

  it('la que se dio de baja o ya está en cola no se puede elegir ni enviar (criterio 4)', () => {
    render(<InactiveRemindersForm clients={CLIENTS} />)

    const rows = screen.getAllByRole('row').slice(1)
    for (const [row, name] of [[rows[1], 'María Solís'], [rows[2], 'Lucía Vargas']] as const) {
      expect((within(row).getByRole('checkbox', { name: copy.select(name) }) as HTMLInputElement).disabled).toBe(true)
      expect((within(row).getByRole('button', { name: copy.sendOne(name) }) as HTMLButtonElement).disabled).toBe(true)
    }
  })

  it('trae el envío masivo y una región que anuncia el resultado', () => {
    render(<InactiveRemindersForm clients={CLIENTS} />)

    expect(screen.getByRole('button', { name: copy.sendSelected })).toBeTruthy()
    expect(screen.getByRole('status')).toBeTruthy()
  })
})
