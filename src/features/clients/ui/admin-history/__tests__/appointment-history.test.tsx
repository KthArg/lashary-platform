import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { AppointmentHistory } from '../components/AppointmentHistory'
import {
  APPOINTMENT_STATUS_LABELS,
  DEPOSIT_STATUS_LABELS,
  HISTORY_LABELS,
  HISTORY_TABLE_HEADERS,
  NOTE_LABELS,
} from '../constants/history-strings'
import { formatAppointmentDate } from '../format-appointment-date'
import type { AppointmentHistoryEntryWithNotes } from '../types/history-results'

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }))
vi.mock('../actions/note-actions', () => ({ addNoteAction: vi.fn(), editNoteAction: vi.fn(), deleteNoteAction: vi.fn() }))

const CLIENT_ID = '11111111-1111-4111-8111-111111111111'
const NOTE_AT_MS = Date.parse('2026-10-01T16:00:00Z')
const newest: AppointmentHistoryEntryWithNotes = {
  id: 'cita-2',
  startsAtMs: Date.parse('2026-10-01T15:00:00Z'),
  status: 'no_show',
  serviceName: 'Volumen',
  depositStatus: 'pending',
  notes: [{ id: 'nota-1', body: 'No llegó ni avisó', createdAtMs: NOTE_AT_MS, updatedAtMs: NOTE_AT_MS }],
}
const oldest: AppointmentHistoryEntryWithNotes = { ...newest, id: 'cita-1', status: 'completed', depositStatus: 'registered', notes: [] }
const renderHistory = (entries: AppointmentHistoryEntryWithNotes[]) =>
  render(<AppointmentHistory clientId={CLIENT_ID} entries={entries} />)

describe('AppointmentHistory — la pestaña Citas de la ficha', () => {
  it('muestra por cita fecha, servicio, estado, pago y anotaciones, en el orden recibido', () => {
    renderHistory([newest, oldest])

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent)
    expect(headers).toEqual(Object.values(HISTORY_TABLE_HEADERS))
    const [, firstRow, secondRow] = screen.getAllByRole('row')
    expect(within(firstRow).getAllByRole('cell').slice(0, 3).map((cell) => cell.textContent)).toEqual([
      'Volumen',
      APPOINTMENT_STATUS_LABELS.no_show,
      DEPOSIT_STATUS_LABELS.pending,
    ])
    expect(within(firstRow).getByRole('rowheader').textContent).toBe(formatAppointmentDate(newest.startsAtMs))
    expect(within(secondRow).getByText(APPOINTMENT_STATUS_LABELS.completed)).toBeTruthy()
    expect(within(secondRow).getByText(DEPOSIT_STATUS_LABELS.registered)).toBeTruthy()
  })

  it('cada anotación aparece en la fila de su cita (criterio 2)', () => {
    renderHistory([newest, oldest])

    const [, firstRow, secondRow] = screen.getAllByRole('row')
    expect(within(firstRow).getByText('No llegó ni avisó')).toBeTruthy()
    expect(within(secondRow).queryByText('No llegó ni avisó')).toBeNull()
    expect(within(secondRow).getByText(NOTE_LABELS.empty)).toBeTruthy()
  })

  it('la fecha se muestra en la hora del estudio, no en UTC', () => {
    expect(formatAppointmentDate(Date.parse('2026-10-01T15:00:00Z'))).toContain('9:00')
  })

  it('una clienta sin citas ve el estado vacío y no una tabla', () => {
    renderHistory([])

    expect(screen.getByText(HISTORY_LABELS.empty)).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('el historial tiene un título que nombra la sección', () => {
    renderHistory([])

    expect(screen.getByRole('region', { name: HISTORY_LABELS.title })).toBeTruthy()
  })
})
