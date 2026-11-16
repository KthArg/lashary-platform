import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { formatStudioDateTime } from '@/shared/studio-time'
import type { ClientAftercare } from '@/features/notifications/domain/aftercare-message'
import { MyAftercare } from '../components/MyAftercare'
import { MY_AFTERCARE_TEXTS } from '../constants/my-aftercare-strings'

const withNote: ClientAftercare = {
  id: 'indicacion-1',
  appointmentId: 'cita-1',
  serviceName: 'Lifting de pestañas',
  aftercareText: 'No mojes las pestañas por 24 horas.\nEvita el vapor.',
  clientNote: 'Vuelve en tres semanas.',
  createdAt: fixedDate('2047-10-01T18:00:00Z'),
}
const withoutNote: ClientAftercare = { ...withNote, id: 'indicacion-2', serviceName: 'Extensiones', clientNote: null }

afterEach(cleanup)

describe('MyAftercare', () => {
  it('muestra cada indicación con servicio, fecha del cierre, texto y nota (US-CLI-06, criterio 4)', () => {
    render(<MyAftercare result={{ ok: true, aftercare: [withNote] }} />)

    const section = screen.getByRole('region', { name: MY_AFTERCARE_TEXTS.title })
    const item = within(section).getByRole('listitem')
    expect(within(item).getByRole('heading', { name: withNote.serviceName })).toBeTruthy()
    expect(within(item).getByText(formatStudioDateTime(withNote.createdAt))).toBeTruthy()
    const careText = within(item).getByText((_, element) => element?.tagName === 'P' && element.textContent === withNote.aftercareText)
    expect(careText.className).toContain('whitespace-pre-line')
    expect(within(item).getByRole('heading', { name: MY_AFTERCARE_TEXTS.noteTitle })).toBeTruthy()
    expect(within(item).getByText(withNote.clientNote as string)).toBeTruthy()
  })

  it('sin nota no pinta el título de la nota', () => {
    render(<MyAftercare result={{ ok: true, aftercare: [withoutNote] }} />)
    expect(screen.queryByRole('heading', { name: MY_AFTERCARE_TEXTS.noteTitle })).toBeNull()
  })

  it('con varias indicaciones, una fila por cada una', () => {
    render(<MyAftercare result={{ ok: true, aftercare: [withNote, withoutNote] }} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('sin indicaciones dice que todavía no hay, con el título a la vista (UI-003)', () => {
    render(<MyAftercare result={{ ok: true, aftercare: [] }} />)
    expect(screen.getByRole('heading', { name: MY_AFTERCARE_TEXTS.title })).toBeTruthy()
    expect(screen.getByText(MY_AFTERCARE_TEXTS.empty)).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('si las indicaciones no cargaron, lo dice en vez de callarlo (UI-003)', () => {
    render(<MyAftercare result={{ ok: false }} />)
    expect(screen.getByRole('alert').textContent).toBe(MY_AFTERCARE_TEXTS.loadFailed)
  })
})
