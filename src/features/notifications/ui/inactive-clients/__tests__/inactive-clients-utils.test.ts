import { describe, it, expect } from 'vitest'
import { formatStudioDate } from '@/shared/studio-time'
import { inactiveClientsMessages as copy, INACTIVE_CLIENTS_PATH } from '../constants/inactive-clients-strings'
import { inactiveClientsUrl, readInactiveClientsLocation } from '../utils/inactive-clients-url'
import { lastReminderLabel } from '../utils/last-reminder-label'

const QUEUED = new Date('2026-11-20T15:00:00Z')
const SENT = new Date('2026-11-21T15:00:00Z')

describe('readInactiveClientsLocation', () => {
  it('lee el rango y la página de la URL', () => {
    expect(readInactiveClientsLocation({ rango: '180', pagina: '3' })).toEqual({ rangeDays: 180, page: 3 })
  })

  it('sin parámetros es el rango de 90 días en la primera página', () => {
    expect(readInactiveClientsLocation({})).toEqual({ rangeDays: 90, page: 1 })
  })

  it.each([['45', 'x'], ['90.5', '-1'], [['30', '60'], ['0']]])('valores raros (%s, %s) caen en lo de por defecto o en el primero repetido', (rango, pagina) => {
    const location = readInactiveClientsLocation({ rango, pagina })
    expect(location.page).toBe(1)
    expect([30, 90]).toContain(location.rangeDays)
  })
})

describe('inactiveClientsUrl', () => {
  it('lleva el rango siempre y la página solo después de la primera', () => {
    expect(inactiveClientsUrl({ rangeDays: 90, page: 1 })).toBe(`${INACTIVE_CLIENTS_PATH}?rango=90`)
    expect(inactiveClientsUrl({ rangeDays: 30, page: 2 })).toBe(`${INACTIVE_CLIENTS_PATH}?rango=30&pagina=2`)
  })
})

describe('lastReminderLabel', () => {
  it('sin recordatorio dice ninguno', () => {
    expect(lastReminderLabel(null)).toBe(copy.noReminder)
  })

  it('enviado muestra la fecha de envío (criterio 3)', () => {
    expect(lastReminderLabel({ status: 'sent', queuedAt: QUEUED, sentAt: SENT })).toBe(copy.reminder.sent(formatStudioDate(SENT)))
  })

  it.each(['pending', 'claimed'] as const)('%s muestra desde cuándo está en cola', (status) => {
    expect(lastReminderLabel({ status, queuedAt: QUEUED, sentAt: null })).toBe(copy.reminder.pending(formatStudioDate(QUEUED)))
  })

  it('fallido lo dice con la fecha en que se puso en cola', () => {
    expect(lastReminderLabel({ status: 'failed', queuedAt: QUEUED, sentAt: null })).toBe(copy.reminder.failed(formatStudioDate(QUEUED)))
  })
})
