import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { clientCalendarMessages } from '../constants/client-calendar-strings'
import { ClientCalendarView } from '../components/ClientCalendarView'
import { ClientCalendarLoading } from '../components/ClientCalendarLoading'
import { toClientCalendarView } from '../utils/client-calendar-format'
import type { ClientCalendarData } from '../types/client-calendar.types'

vi.mock('next/form', () => ({ default: (props: ComponentProps<'form'>) => <form {...props} /> }))

afterEach(cleanup)

const m = clientCalendarMessages
const option = { key: 't2', techniqueId: 't2', name: 'Diseño de cejas', isFirstTime: true, durationMin: 60 }
const base = { options: [option], date: '2026-10-19', today: '2026-10-19' }

const ready: ClientCalendarData = {
  ...base,
  status: 'ready',
  selected: option,
  slots: [
    { startMin: 540, endMin: 600, status: 'free' },
    { startMin: 570, endMin: 630, status: 'busy' },
  ],
}

const renderData = (data: ClientCalendarData) => render(<ClientCalendarView view={toClientCalendarView(data)} />)

describe('ClientCalendarView — US-AGE-02', () => {
  it('diferencia libres y ocupados con texto, y lo ocupado no se puede seleccionar (criterios 1 y 3)', () => {
    renderData(ready)
    const free = screen.getByRole('radio', { name: /09:00–10:00.*Libre/ }) as HTMLInputElement
    const busy = screen.getByRole('radio', { name: /09:30–10:30.*Ocupado/ }) as HTMLInputElement
    expect(free.disabled).toBe(false)
    expect(busy.disabled).toBe(true)
  })

  it('navega entre días con enlaces que conservan el servicio, sin ir a días pasados (criterio 4)', () => {
    renderData(ready)
    expect(screen.queryByRole('link', { name: new RegExp(m.previousDay) })).toBeNull()
    expect(screen.getByRole('link', { name: new RegExp(m.nextDay) }).getAttribute('href')).toBe(
      '/portal/citas/calendario?servicio=t2&fecha=2026-10-20',
    )
    expect(screen.getByRole('heading', { level: 2 }).textContent).toBe('lunes, 19 de octubre de 2026')
  })

  it('las flechas son decorativas: el nombre accesible del enlace es solo su texto', () => {
    renderData({ ...ready, date: '2026-10-21' })
    expect(screen.getByRole('link', { name: m.previousDay })).toBeTruthy()
    expect(screen.getByRole('link', { name: m.nextDay })).toBeTruthy()
  })

  it('el texto corto del teléfono está contenido en el nombre accesible (WCAG 2.5.3)', () => {
    renderData({ ...ready, date: '2026-10-21' })
    for (const [name, short] of [
      [m.previousDay, m.previousDayShort],
      [m.nextDay, m.nextDayShort],
    ]) {
      const link = screen.getByRole('link', { name })
      expect(link.textContent).toContain(short)
      expect(name.toLowerCase()).toContain(short.toLowerCase())
    }
  })

  it('un día posterior a hoy ofrece volver al día anterior', () => {
    renderData({ ...ready, date: '2026-10-21' })
    expect(screen.getByRole('link', { name: m.previousDay }).getAttribute('href')).toBe(
      '/portal/citas/calendario?servicio=t2&fecha=2026-10-20',
    )
  })

  it('muestra la duración con limpieza en el selector de servicio (criterio 5)', () => {
    renderData(ready)
    expect(screen.getByRole('option', { name: m.serviceOption('Diseño de cejas', true, 60) })).toBeTruthy()
  })

  it('estados vacíos (UI-003): sin servicios, sin servicio elegido y día sin espacios', () => {
    renderData({ status: 'noServices' })
    expect(screen.getByText(m.noServices)).toBeTruthy()
    cleanup()
    renderData({ ...base, status: 'chooseService' })
    expect(screen.getByText(m.chooseService)).toBeTruthy()
    cleanup()
    renderData({ ...ready, slots: [] })
    expect(screen.getByText(m.noSlots)).toBeTruthy()
  })

  it('un pedido que no se pudo calcular se avisa como alerta', () => {
    renderData({ ...base, status: 'invalid', selected: option })
    expect(screen.getByRole('alert').textContent).toBe(m.invalid)
  })

  it('una sesión que no es de clienta ve el aviso, sin selector ni espacios', () => {
    renderData({ status: 'forbidden' })
    expect(screen.getByRole('alert').textContent).toBe(m.accessDenied)
    expect(screen.queryByRole('combobox')).toBeNull()
  })

  it('carga (UI-003): un estado con su texto, anunciado a lectores de pantalla', () => {
    render(<ClientCalendarLoading />)
    expect(screen.getByRole('status').textContent).toBe(m.loading)
  })
})
