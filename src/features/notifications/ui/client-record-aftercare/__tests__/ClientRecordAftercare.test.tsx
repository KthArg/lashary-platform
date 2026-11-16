import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, cleanup, within } from '@testing-library/react'
import { fixedDate } from '@/shared/testing/fixed-clock'
import { formatStudioDateTime } from '@/shared/studio-time'
import type { AdminAftercare, AftercareDeliveryState } from '@/features/notifications/domain/aftercare-message'
import { ClientRecordAftercare } from '../components/ClientRecordAftercare'
import { CLIENT_RECORD_AFTERCARE_TEXTS, DELIVERY_STATE_TEXTS } from '../constants/client-record-aftercare-strings'

const withNote: AdminAftercare = {
  id: 'indicacion-1',
  appointmentId: 'cita-1',
  serviceName: 'Lifting de pestañas',
  aftercareText: 'No mojes las pestañas por 24 horas.\nEvita el vapor.',
  clientNote: 'Vuelve en tres semanas.',
  deliveryState: 'sentWhatsapp',
  createdAt: fixedDate('2047-10-01T18:00:00Z'),
}
const withoutNote: AdminAftercare = { ...withNote, id: 'indicacion-2', serviceName: 'Extensiones', clientNote: null }

const DELIVERY_STATES = Object.keys(DELIVERY_STATE_TEXTS) as AftercareDeliveryState[]

afterEach(cleanup)

describe('ClientRecordAftercare', () => {
  it('muestra servicio, fecha del cierre, estado del envío, texto y nota (US-CLI-06, criterio 4)', () => {
    render(<ClientRecordAftercare result={{ ok: true, aftercare: [withNote] }} />)

    const section = screen.getByRole('region', { name: CLIENT_RECORD_AFTERCARE_TEXTS.title })
    const item = within(section).getByRole('listitem')
    expect(within(item).getByRole('heading', { name: withNote.serviceName })).toBeTruthy()
    expect(within(item).getByText(formatStudioDateTime(withNote.createdAt))).toBeTruthy()
    expect(within(item).getByText(DELIVERY_STATE_TEXTS.sentWhatsapp)).toBeTruthy()
    const careText = within(item).getByText((_, element) => element?.tagName === 'P' && element.textContent === withNote.aftercareText)
    expect(careText.className).toContain('whitespace-pre-line')
    expect(within(item).getByRole('heading', { name: CLIENT_RECORD_AFTERCARE_TEXTS.noteTitle })).toBeTruthy()
    expect(within(item).getByText(withNote.clientNote as string)).toBeTruthy()
  })

  it.each(DELIVERY_STATES)('el estado %s se dice con su texto', (deliveryState) => {
    render(<ClientRecordAftercare result={{ ok: true, aftercare: [{ ...withNote, deliveryState }] }} />)
    expect(screen.getByText(DELIVERY_STATE_TEXTS[deliveryState])).toBeTruthy()
  })

  it('sin nota no pinta el título de la nota', () => {
    render(<ClientRecordAftercare result={{ ok: true, aftercare: [withoutNote] }} />)
    expect(screen.queryByRole('heading', { name: CLIENT_RECORD_AFTERCARE_TEXTS.noteTitle })).toBeNull()
  })

  it('sin indicaciones dice que todavía no hay, con el título a la vista (UI-003)', () => {
    render(<ClientRecordAftercare result={{ ok: true, aftercare: [] }} />)
    expect(screen.getByRole('heading', { name: CLIENT_RECORD_AFTERCARE_TEXTS.title })).toBeTruthy()
    expect(screen.getByText(CLIENT_RECORD_AFTERCARE_TEXTS.empty)).toBeTruthy()
    expect(screen.queryByRole('list')).toBeNull()
  })

  it('si las indicaciones no cargaron, lo dice en vez de callarlo (UI-003)', () => {
    render(<ClientRecordAftercare result={{ ok: false }} />)
    expect(screen.getByRole('alert').textContent).toBe(CLIENT_RECORD_AFTERCARE_TEXTS.loadFailed)
  })
})
