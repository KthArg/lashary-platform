import { describe, expect, it } from 'vitest'
import {
  INACTIVE_RANGE_DAYS,
  INACTIVE_RANGE_DEFAULT_DAYS,
  INACTIVE_REMINDER_MAX_CLIENTS_PER_SEND,
  canQueueInactiveReminder,
  inactiveSince,
  isInactiveRangeDays,
  readInactiveRangeDays,
  validateInactiveQueueRequest,
  type InactiveClient,
} from '../inactive-reminder'
import { isInactiveQueueEmpty, isInactiveQueueTooMany } from '../errors'

const CLIENT: InactiveClient = {
  clientId: '00000000-0000-0000-0000-0000000000c1',
  fullName: 'Ana Rodríguez',
  lastVisitAt: null,
  optedOut: false,
  lastReminder: null,
}

describe('rango de inactividad', () => {
  it('la administradora elige entre 30, 60, 90 y 180 días, con 90 por defecto (decisión del 2026-11-22)', () => {
    expect(INACTIVE_RANGE_DAYS).toEqual([30, 60, 90, 180])
    expect(INACTIVE_RANGE_DEFAULT_DAYS).toBe(90)
  })

  it.each([30, 60, 90, 180])('%i días es un rango válido', (days) => {
    expect(isInactiveRangeDays(days)).toBe(true)
  })

  it.each([0, 45, 365, -90, 90.5, '90', null, undefined])('%s no es un rango válido', (days) => {
    expect(isInactiveRangeDays(days)).toBe(false)
  })

  it('lee el rango que llega de la URL como texto', () => {
    expect(readInactiveRangeDays('180')).toBe(180)
    expect(readInactiveRangeDays('30')).toBe(30)
  })

  it.each(['45', 'noventa', '', '90.0', ' 90', undefined, null, ['90']])('un rango fuera de la lista (%s) vuelve al de por defecto', (raw) => {
    expect(readInactiveRangeDays(raw)).toBe(INACTIVE_RANGE_DEFAULT_DAYS)
  })

  it('la fecha de corte es hoy menos el rango, con el reloj que se le pasa (DOM-004)', () => {
    const now = new Date('2026-11-22T15:00:00Z')
    expect(inactiveSince(now, 90).toISOString()).toBe('2026-08-24T15:00:00.000Z')
    expect(inactiveSince(now, 30).toISOString()).toBe('2026-10-23T15:00:00.000Z')
  })
})

describe('quién puede recibir un recordatorio', () => {
  it('una clienta suscrita y sin recordatorio en cola puede recibirlo', () => {
    expect(canQueueInactiveReminder(CLIENT)).toBe(true)
  })

  it('la que se dio de baja no (criterio 4)', () => {
    expect(canQueueInactiveReminder({ ...CLIENT, optedOut: true })).toBe(false)
  })

  it.each(['pending', 'claimed'] as const)('la que ya tiene un recordatorio %s no', (status) => {
    expect(canQueueInactiveReminder({ ...CLIENT, lastReminder: { status, queuedAt: new Date(), sentAt: null } })).toBe(false)
  })

  it.each(['sent', 'failed'] as const)('la que tuvo uno %s puede recibir otro', (status) => {
    const sentAt = status === 'sent' ? new Date() : null
    expect(canQueueInactiveReminder({ ...CLIENT, lastReminder: { status, queuedAt: new Date(), sentAt } })).toBe(true)
  })
})

describe('validateInactiveQueueRequest', () => {
  it('deja una lista sin repetidos ni vacíos', () => {
    const result = validateInactiveQueueRequest(['a', ' b ', 'a', '', '  '])
    expect(result).toEqual({ ok: true, value: ['a', 'b'] })
  })

  it('una lista vacía es un error tipado', () => {
    const result = validateInactiveQueueRequest(['', ' '])
    expect(result.ok).toBe(false)
    expect(!result.ok && isInactiveQueueEmpty(result.error)).toBe(true)
  })

  it('más clientas que el tope por envío es un error tipado con el tope', () => {
    const ids = Array.from({ length: INACTIVE_REMINDER_MAX_CLIENTS_PER_SEND + 1 }, (_, i) => `id-${i}`)
    const result = validateInactiveQueueRequest(ids)
    expect(result.ok).toBe(false)
    expect(!result.ok && isInactiveQueueTooMany(result.error) && result.error.max).toBe(INACTIVE_REMINDER_MAX_CLIENTS_PER_SEND)
  })

  it('justo el tope pasa', () => {
    const ids = Array.from({ length: INACTIVE_REMINDER_MAX_CLIENTS_PER_SEND }, (_, i) => `id-${i}`)
    expect(validateInactiveQueueRequest(ids).ok).toBe(true)
  })

  it('el tope se puede pasar explícito', () => {
    expect(validateInactiveQueueRequest(['a', 'b'], 1).ok).toBe(false)
  })
})
