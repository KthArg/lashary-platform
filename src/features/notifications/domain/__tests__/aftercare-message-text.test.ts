import { describe, it, expect } from 'vitest'
import { AFTERCARE_MESSAGE_TEXTS, TEMPLATE_LINE_SEPARATOR, buildAftercareMessage, buildAftercareTemplateVariables } from '../aftercare-message-text'

const SERVICE_NAME = 'Lifting de pestañas'
const AFTERCARE_TEXT = 'No mojes las pestañas durante 24 horas.'
const CLIENT_NOTE = 'Evita el maquillaje en los ojos esta semana.'
const MY_APPOINTMENTS_URL = 'https://lashary.example/mis-citas'
const PARAGRAPH_SEPARATOR = '\n\n'

const withoutNote = { serviceName: SERVICE_NAME, aftercareText: AFTERCARE_TEXT, clientNote: null }
const withNote = { ...withoutNote, clientNote: CLIENT_NOTE }

describe('buildAftercareMessage', () => {
  it('sin nota lleva el servicio, las indicaciones y el enlace a Mis citas, en ese orden', () => {
    expect(buildAftercareMessage(withoutNote, MY_APPOINTMENTS_URL)).toBe([
      AFTERCARE_MESSAGE_TEXTS.heading(SERVICE_NAME),
      AFTERCARE_TEXT,
      AFTERCARE_MESSAGE_TEXTS.myAppointmentsLine(MY_APPOINTMENTS_URL),
    ].join(PARAGRAPH_SEPARATOR))
  })

  it('con nota agrega su título y su texto entre las indicaciones y el enlace', () => {
    expect(buildAftercareMessage(withNote, MY_APPOINTMENTS_URL)).toBe([
      AFTERCARE_MESSAGE_TEXTS.heading(SERVICE_NAME),
      AFTERCARE_TEXT,
      AFTERCARE_MESSAGE_TEXTS.noteTitle,
      CLIENT_NOTE,
      AFTERCARE_MESSAGE_TEXTS.myAppointmentsLine(MY_APPOINTMENTS_URL),
    ].join(PARAGRAPH_SEPARATOR))
  })

  it('sin nota no deja el título de la nota suelto', () => {
    expect(buildAftercareMessage(withoutNote, MY_APPOINTMENTS_URL)).not.toContain(AFTERCARE_MESSAGE_TEXTS.noteTitle)
  })
})

describe('buildAftercareTemplateVariables', () => {
  it('la plantilla de WhatsApp recibe el servicio, los cuidados y el enlace a Mis citas, en ese orden', () => {
    expect(buildAftercareTemplateVariables(withoutNote, MY_APPOINTMENTS_URL)).toEqual([SERVICE_NAME, AFTERCARE_TEXT, MY_APPOINTMENTS_URL])
  })

  it('con nota, la suma después de los cuidados con su título', () => {
    const [, careLine] = buildAftercareTemplateVariables(withNote, MY_APPOINTMENTS_URL)
    expect(careLine).toBe([AFTERCARE_TEXT, `${AFTERCARE_MESSAGE_TEXTS.noteTitle}: ${CLIENT_NOTE}`].join(TEMPLATE_LINE_SEPARATOR))
  })

  it('cambia los saltos de línea por un separador: WhatsApp no admite saltos de línea en una variable', () => {
    const packageText = `Diseño de cejas\nNo maquilles la zona.\n\nSet volumen\n  No mojes las pestañas.`
    const [, careLine] = buildAftercareTemplateVariables({ ...withoutNote, aftercareText: packageText }, MY_APPOINTMENTS_URL)
    expect(careLine).toBe(['Diseño de cejas', 'No maquilles la zona.', 'Set volumen', 'No mojes las pestañas.'].join(TEMPLATE_LINE_SEPARATOR))
    expect(careLine).not.toMatch(/\n|\t| {2,}/)
  })
})
