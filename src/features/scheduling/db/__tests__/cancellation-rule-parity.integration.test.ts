import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Client as PgClient } from 'pg'
import { isOk } from '@/shared/result'
import { evaluateCancellation } from '../../domain/appointment-cancellation'
import { MS_PER_HOUR } from '../../domain/appointment-cancellation.constants'

const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const DB_URL = process.env.SUPABASE_DB_URL || DEFAULT_LOCAL_DB_URL
const LOCAL_HOSTS = ['127.0.0.1', 'localhost']

const STATUSES = [
  'pending_approval',
  'approved',
  'confirmed',
  'rejected',
  'cancelled',
  'completed',
  'no_show',
  'desconocido',
]
const DEPOSITS = [0, 10000]
const MS_FROM_BOUNDARY = 1000
const MS_PER_MINUTE = 60_000

const isLocalHost = (rawUrl: string): boolean => {
  try {
    return LOCAL_HOSTS.includes(new URL(rawUrl).hostname)
  } catch {
    return false
  }
}

async function isReachable(): Promise<boolean> {
  if (!isLocalHost(DB_URL)) return false
  try {
    const probe = new PgClient({ connectionString: DB_URL })
    await probe.connect()
    await probe.end()
    return true
  } catch {
    return false
  }
}

const reachable = await isReachable()
if (!reachable) {
  console.warn('[scheduling/db] Supabase local no disponible — comparación de la regla de cancelación omitida.')
}

describe.skipIf(!reachable)('la regla de cancelación del dominio y la de la base dan lo mismo (Supabase local)', () => {
  let admin: PgClient
  let windowHours: number

  beforeAll(async () => {
    admin = new PgClient({ connectionString: DB_URL })
    await admin.connect()
    const policy = await admin.query('SELECT cancellation_window_hours FROM public.scheduling_cancellation_policy')
    windowHours = policy.rows[0].cancellation_window_hours
  })

  afterAll(async () => {
    await admin?.end()
  })

  it('estado, antelación y anticipo: el dominio y la función SQL coinciden en cada combinación', async () => {
    const windowMs = windowHours * MS_PER_HOUR
    const offsetsMs = [
      -MS_PER_HOUR,
      MS_FROM_BOUNDARY,
      MS_PER_MINUTE,
      windowMs - MS_FROM_BOUNDARY,
      windowMs + MS_FROM_BOUNDARY,
      windowMs + MS_PER_HOUR,
    ]
    const mismatches: string[] = []

    for (const status of STATUSES) {
      for (const deposit of DEPOSITS) {
        for (const offsetMs of offsetsMs) {
          const { rows } = await admin.query(
            `SELECT e.cancellable, e.within_window, e.forfeited_deposit, e.window_hours,
                    (extract(epoch FROM now()) * 1000)::bigint AS now_ms
               FROM public.scheduling_evaluate_cancellation(
                      $1, now() + ($2::bigint * interval '1 millisecond'), $3::bigint) e`,
            [status, offsetMs, deposit],
          )
          const row = rows[0]
          const nowMs = Number(row.now_ms)
          const domain = evaluateCancellation({
            appointmentId: 'cita',
            status,
            startsAtMs: nowMs + offsetMs,
            nowMs,
            windowHours: row.window_hours,
            depositRequired: deposit,
          })

          const label = `${status} | anticipo ${deposit} | ${offsetMs} ms`
          if (!row.cancellable) {
            if (isOk(domain)) mismatches.push(`${label}: la base no cancela y el dominio sí`)
            continue
          }
          if (!isOk(domain)) {
            mismatches.push(`${label}: la base cancela y el dominio no`)
            continue
          }
          if (domain.value.withinWindow !== row.within_window) mismatches.push(`${label}: ventana distinta`)
          if (domain.value.forfeitedDeposit !== Number(row.forfeited_deposit)) {
            mismatches.push(`${label}: anticipo perdido distinto`)
          }
        }
      }
    }

    expect(mismatches).toEqual([])
  })
})
