import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { err, ok } from '@/shared/result'
import { storageFailed } from '../../../domain/errors'
import type { SchedulingAlert } from '../../../domain/alert'
import { alertsMessages, ALERTS_PATH } from '../constants/alerts-strings'
import { AlertsView } from '../components/AlertsView'
import { toAlertsViewModel } from '../utils/alerts-format'

afterEach(cleanup)

const alert: SchedulingAlert = {
  id: 'alerta-1',
  kind: 'appointment_overlap_rejected',
  resourceId: 'recurso-estudio',
  requestedFromMs: Date.parse('2027-03-01T16:00:00Z'),
  requestedUntilMs: Date.parse('2027-03-01T18:15:00Z'),
  createdAtMs: Date.parse('2026-10-19T17:30:00Z'),
}

describe('toAlertsViewModel', () => {
  it('formatea el espacio pedido y la fecha en la hora del estudio (UTC−6)', () => {
    const view = toAlertsViewModel(ok([alert]))

    expect(view).toMatchObject({ status: 'ready' })
    if (view.status !== 'ready') return
    expect(view.alerts[0].title).toBe(alertsMessages.kinds.appointment_overlap_rejected.title)
    expect(view.alerts[0].requested).toContain('10:00–12:15')
    expect(view.alerts[0].requested.toLowerCase()).toContain('marzo')
    expect(view.alerts[0].recorded).toContain('11:30')
  })

  it('sin alertas es el estado vacío; un fallo de la base es error, nunca «sin alertas»', () => {
    expect(toAlertsViewModel(ok([]))).toEqual({ status: 'empty' })
    expect(toAlertsViewModel(err(storageFailed('sin conexión')))).toEqual({ status: 'error' })
  })

  it('no expone la clienta ni el recurso', () => {
    const view = toAlertsViewModel(ok([alert]))
    expect(JSON.stringify(view)).not.toContain('recurso-estudio')
  })
})

describe('AlertsView — pestaña «Alertas»', () => {
  it('lista cada alerta con su título, el detalle y cuándo ocurrió', () => {
    render(<AlertsView view={toAlertsViewModel(ok([alert, { ...alert, id: 'alerta-2' }]))} />)

    expect(screen.getByRole('heading', { level: 1, name: alertsMessages.title })).toBeTruthy()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(within(items[0]).getByText(alertsMessages.kinds.appointment_overlap_rejected.title)).toBeTruthy()
    expect(within(items[0]).getByText(alertsMessages.requestedLabel)).toBeTruthy()
    expect(within(items[0]).getByText(alertsMessages.recordedLabel)).toBeTruthy()
  })

  it('sin alertas explica que es lo esperado (UI-003)', () => {
    render(<AlertsView view={{ status: 'empty' }} />)
    expect(screen.getByText(alertsMessages.empty)).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('si no se pueden leer, avisa con role="alert" y deja reintentar', () => {
    render(<AlertsView view={{ status: 'error' }} />)
    expect(screen.getByRole('alert').textContent).toContain(alertsMessages.loadError)
    expect(screen.getByRole('link', { name: alertsMessages.retry }).getAttribute('href')).toBe(ALERTS_PATH)
  })
})
