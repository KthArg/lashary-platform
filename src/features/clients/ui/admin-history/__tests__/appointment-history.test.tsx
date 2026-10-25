import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { AppointmentHistory } from '../components/AppointmentHistory'
import {
  APPOINTMENT_STATUS_LABELS,
  DEPOSIT_STATUS_LABELS,
  HISTORY_LABELS,
  HISTORY_TABLE_HEADERS,
} from '../constants/history-strings'
import { formatAppointmentDate } from '../format-appointment-date'
import type { AppointmentHistoryEntry } from '@/features/clients/domain/history/appointment-history.types'

const newest: AppointmentHistoryEntry = {
  id: 'cita-2',
  startsAtMs: Date.parse('2026-10-01T15:00:00Z'),
  status: 'no_show',
  serviceName: 'Volumen',
  depositStatus: 'pending',
}
const oldest: AppointmentHistoryEntry = { ...newest, id: 'cita-1', status: 'completed', depositStatus: 'registered' }

describe('AppointmentHistory — la pestaña Citas de la ficha', () => {
  it('muestra por cita fecha, servicio, estado, pago y anotaciones, en el orden recibido', () => {
    render(<AppointmentHistory entries={[newest, oldest]} />)

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent)
    expect(headers).toEqual(Object.values(HISTORY_TABLE_HEADERS))
    const [, firstRow, secondRow] = screen.getAllByRole('row')
    expect(within(firstRow).getAllByRole('cell').map((cell) => cell.textContent)).toEqual([
      'Volumen',
      APPOINTMENT_STATUS_LABELS.no_show,
      DEPOSIT_STATUS_LABELS.pending,
      HISTORY_LABELS.pendingValue,
    ])
    expect(within(firstRow).getByRole('rowheader').textContent).toBe(formatAppointmentDate(newest.startsAtMs))
    expect(within(secondRow).getByText(APPOINTMENT_STATUS_LABELS.completed)).toBeTruthy()
    expect(within(secondRow).getByText(DEPOSIT_STATUS_LABELS.registered)).toBeTruthy()
  })

  it('la fecha se muestra en la hora del estudio, no en UTC', () => {
    expect(formatAppointmentDate(Date.parse('2026-10-01T15:00:00Z'))).toContain('9:00')
  })

  it('una clienta sin citas ve el estado vacío y no una tabla', () => {
    render(<AppointmentHistory entries={[]} />)

    expect(screen.getByText(HISTORY_LABELS.empty)).toBeTruthy()
    expect(screen.queryByRole('table')).toBeNull()
  })

  it('el historial tiene un título que nombra la sección', () => {
    render(<AppointmentHistory entries={[]} />)

    expect(screen.getByRole('region', { name: HISTORY_LABELS.title })).toBeTruthy()
  })
})
