import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CHANNEL_SEND_TIMEOUT_MS } from '../../channels/send-timeout'
import { CLAIM_BATCH_SIZE, CLAIM_TTL_MINUTES, CYCLE_MAX_DURATION_SECONDS } from '../claim-limits'

const CRON_ROUTE = join(process.cwd(), 'src/app/api/cron/notifications-reminders/route.ts')
const SENDERS_PER_CYCLE = 2
const CHANNELS_PER_MESSAGE = 2

describe('límites del reclamo', () => {
  it('las dos tandas del ciclo, con los dos canales caídos, caben en lo que dura la ruta', () => {
    const worstCaseMs = CLAIM_BATCH_SIZE * SENDERS_PER_CYCLE * CHANNELS_PER_MESSAGE * CHANNEL_SEND_TIMEOUT_MS
    expect(worstCaseMs).toBeLessThanOrEqual(CYCLE_MAX_DURATION_SECONDS * 1000)
  })

  it('un reclamo no vence antes de que termine el peor ciclo', () => {
    expect(CYCLE_MAX_DURATION_SECONDS).toBeLessThan(CLAIM_TTL_MINUTES * 60)
  })

  it('la ruta del cron declara la misma duración máxima', () => {
    const declared = /export const maxDuration = (\d+)/.exec(readFileSync(CRON_ROUTE, 'utf8'))
    expect(Number(declared?.[1])).toBe(CYCLE_MAX_DURATION_SECONDS)
  })
})
