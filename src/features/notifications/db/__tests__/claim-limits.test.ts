import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CHANNEL_SEND_TIMEOUT_MS } from '../../channels/send-timeout'
import { MESSAGE_PURPOSES } from '../../application/ports'
import {
  CLAIM_BATCH_SIZE,
  CLAIM_TTL_MINUTES,
  CYCLE_MAX_DURATION_SECONDS,
  MESSAGE_KINDS_SENT_PER_CYCLE,
  PURPOSES_SENT_IN_OWN_CYCLE,
  PURPOSES_SENT_IN_SERIES,
} from '../claim-limits'

const CRON_ROUTE = join(process.cwd(), 'src/app/api/cron/notifications-reminders/route.ts')
const CHANNELS_PER_MESSAGE = 2
// Lo que el ciclo necesita fuera de los envíos: vencer reagendados, reintentar avisos perdidos, descubrir y reconciliar.
const MIN_MARGIN_FOR_OTHER_STEPS_MS = 60_000

describe('límites del reclamo', () => {
  it('las tandas de todos los tipos de mensaje, con los dos canales caídos, caben en lo que dura la ruta', () => {
    const worstCaseMs = CLAIM_BATCH_SIZE * MESSAGE_KINDS_SENT_PER_CYCLE * CHANNELS_PER_MESSAGE * CHANNEL_SEND_TIMEOUT_MS
    expect(worstCaseMs).toBeLessThanOrEqual(CYCLE_MAX_DURATION_SECONDS * 1000)
  })

  it('y todavía sobra margen para vencer, reintentar, descubrir y reconciliar', () => {
    const worstCaseMs = CLAIM_BATCH_SIZE * MESSAGE_KINDS_SENT_PER_CYCLE * CHANNELS_PER_MESSAGE * CHANNEL_SEND_TIMEOUT_MS
    expect(worstCaseMs + MIN_MARGIN_FOR_OTHER_STEPS_MS).toBeLessThanOrEqual(CYCLE_MAX_DURATION_SECONDS * 1000)
  })

  it('cuenta un envío en serie por cada tipo de mensaje que se reclama en el ciclo de recordatorios', () => {
    expect(MESSAGE_KINDS_SENT_PER_CYCLE).toBe(PURPOSES_SENT_IN_SERIES.length)
  })

  it('cada tipo de mensaje está en una sola lista: en serie en el ciclo de recordatorios o en su propio ciclo en paralelo', () => {
    const classified = [...PURPOSES_SENT_IN_SERIES, ...PURPOSES_SENT_IN_OWN_CYCLE]
    expect(new Set(classified).size).toBe(classified.length)
    expect([...classified].sort()).toEqual([...MESSAGE_PURPOSES].sort())
  })

  it('el lote reclama más de un mensaje por tipo en cada corrida', () => {
    expect(CLAIM_BATCH_SIZE).toBeGreaterThanOrEqual(2)
  })

  it('un reclamo no vence antes de que termine el peor ciclo', () => {
    expect(CYCLE_MAX_DURATION_SECONDS).toBeLessThan(CLAIM_TTL_MINUTES * 60)
  })

  it('la ruta del cron declara la misma duración máxima', () => {
    const declared = /export const maxDuration = (\d+)/.exec(readFileSync(CRON_ROUTE, 'utf8'))
    expect(Number(declared?.[1])).toBe(CYCLE_MAX_DURATION_SECONDS)
  })
})
