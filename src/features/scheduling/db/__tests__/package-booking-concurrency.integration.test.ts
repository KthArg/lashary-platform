import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { Client as PgClient } from 'pg'
import { isErr, isOk } from '@/shared/result'
import { bookPackageAppointment } from '../../application/book-package-appointment'
import { noDelinquencyYet } from '../../application/no-delinquency'
import { MS_PER_MINUTE } from '../../domain/appointment-window.constants'
import { createSupabasePackageBookingRepository } from '../package-booking-repository'
import type { PackageBookingRepository } from '../../application/ports'

const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const DB_URL = process.env.SUPABASE_DB_URL || DEFAULT_LOCAL_DB_URL
const LOCAL_HOSTS = ['127.0.0.1', 'localhost']

const STUDIO_RESOURCE_ID = '00000000-0000-0000-0000-000000000a01'
const SEEDED_PACKAGE_NAME = 'Cejas y pestañas clásico'
const CONCURRENT_CLIENTAS = 10
const ROUNDS = 3
const ROUND_TIMEOUT_MS = 20_000
const SETUP_TIMEOUT_MS = 60_000
const TUESDAY_ISO_WEEKDAY = 2
const OPEN_FROM_MIN = 120
const FIRST_TUESDAY_OPENING_MS = Date.parse('2046-01-02T08:00:00Z')
const MS_PER_WEEK = 7 * 24 * 60 * MS_PER_MINUTE
const RUN_OFFSET_WEEKS_SPREAD = 40
const SPARE_MINUTES_IN_BLOCK = 60
const TEST_PHONE_PREFIX = '+5068001'

const isLocalHost = (rawUrl: string): boolean => {
  try {
    return LOCAL_HOSTS.includes(new URL(rawUrl).hostname)
  } catch {
    return false
  }
}
const isLocalSetup = Boolean(API_URL && ANON_KEY) && isLocalHost(API_URL) && isLocalHost(DB_URL)

async function isReachable(): Promise<boolean> {
  try {
    const response = await fetch(`${API_URL}/rest/v1/`, { headers: { apikey: ANON_KEY } })
    if (response.status >= 500) return false
    const probe = new PgClient({ connectionString: DB_URL })
    await probe.connect()
    await probe.end()
    return true
  } catch {
    return false
  }
}

const reachable = isLocalSetup && (await isReachable())
if (!reachable) {
  console.warn('[scheduling/db] Supabase local no disponible — prueba de concurrencia de la reserva de paquete omitida.')
}

type Clienta = { userId: string; repository: PackageBookingRepository }

type SeededPackage = {
  id: string
  price: number
  deposit: number
  durationMin: number
  bufferMin: number
}

async function signUpClienta(index: number): Promise<Clienta> {
  const anon = createClient(API_URL, ANON_KEY)
  const { data, error } = await anon.auth.signUp({
    email: `package-booking-concurrency-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}@lashary.test`,
    password: `pw-${Math.random().toString(36).slice(2)}`,
  })
  if (error || !data.session || !data.user) {
    throw new Error(`no se pudo crear la clienta de prueba: ${error?.message ?? 'sin sesión'}`)
  }
  const client = createClient(API_URL, ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  })
  return { userId: data.user.id, repository: createSupabasePackageBookingRepository(client) }
}

describe.skipIf(!reachable)('US-AGE-04 — 10 clientas reservando el mismo paquete en el mismo espacio a la vez (Supabase local)', () => {
  let admin: PgClient
  let pkg: SeededPackage
  let weeklyBlockId: string
  let clientas: Clienta[] = []
  const runOffsetWeeks = Math.floor(Math.random() * RUN_OFFSET_WEEKS_SPREAD)

  beforeAll(async () => {
    admin = new PgClient({ connectionString: DB_URL })
    await admin.connect()

    clientas = await Promise.all(Array.from({ length: CONCURRENT_CLIENTAS }, (_, index) => signUpClienta(index)))
    for (const [index, clienta] of clientas.entries()) {
      await admin.query(
        'INSERT INTO public.clients_profiles (user_id, full_name, email, phone) VALUES ($1, $2, $3, $4)',
        [clienta.userId, `Clienta paquete ${index}`, `package-booking-concurrency-${clienta.userId}@lashary.test`, `${TEST_PHONE_PREFIX}${index}`],
      )
    }

    const seededPackage = await admin.query(
      'SELECT id, price, deposit FROM public.catalog_packages WHERE name = $1 AND is_active',
      [SEEDED_PACKAGE_NAME],
    )
    if (seededPackage.rows.length === 0) throw new Error(`no está sembrado el paquete «${SEEDED_PACKAGE_NAME}»`)
    const terms = await admin.query(
      'SELECT sum(duration_min)::int AS duration_min, sum(buffer_min)::int AS buffer_min FROM public.catalog_package_booking_terms($1)',
      [seededPackage.rows[0].id],
    )
    pkg = {
      id: seededPackage.rows[0].id,
      price: Number(seededPackage.rows[0].price),
      deposit: Number(seededPackage.rows[0].deposit),
      durationMin: terms.rows[0].duration_min,
      bufferMin: terms.rows[0].buffer_min,
    }

    const block = await admin.query(
      `INSERT INTO public.scheduling_weekly_availability (resource_id, weekday, start_min, end_min)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [
        STUDIO_RESOURCE_ID,
        TUESDAY_ISO_WEEKDAY,
        OPEN_FROM_MIN,
        OPEN_FROM_MIN + pkg.durationMin + pkg.bufferMin + SPARE_MINUTES_IN_BLOCK,
      ],
    )
    weeklyBlockId = block.rows[0].id
  }, SETUP_TIMEOUT_MS)

  afterAll(async () => {
    if (!admin) return
    const userIds = clientas.map((clienta) => clienta.userId)
    if (userIds.length > 0) {
      await admin.query(
        'DELETE FROM public.scheduling_appointments WHERE client_id IN (SELECT id FROM public.clients_profiles WHERE user_id = ANY($1::uuid[]))',
        [userIds],
      )
    }
    if (weeklyBlockId) await admin.query('DELETE FROM public.scheduling_weekly_availability WHERE id = $1', [weeklyBlockId])
    if (userIds.length > 0) await admin.query('DELETE FROM auth.users WHERE id = ANY($1::uuid[])', [userIds])
    await admin.end()
  })

  it.each(Array.from({ length: ROUNDS }, (_, index) => index))(
    'ronda %i: exactamente una clienta reserva el paquete y el resto recibe espacio no disponible',
    async (round) => {
      const startsAtMs = FIRST_TUESDAY_OPENING_MS + (runOffsetWeeks + round) * MS_PER_WEEK

      const results = await Promise.all(
        clientas.map((clienta) =>
          bookPackageAppointment({ bookings: clienta.repository, delinquency: noDelinquencyYet })({
            resourceId: STUDIO_RESOURCE_ID,
            startsAtMs,
            packageId: pkg.id,
          }),
        ),
      )

      const winners = results.filter(isOk)
      const losers = results.filter(isErr)
      expect(winners).toHaveLength(1)
      expect(losers).toHaveLength(CONCURRENT_CLIENTAS - 1)
      for (const loser of losers) expect(loser.error.code).toBe('SCHEDULING_SPACE_NOT_AVAILABLE')

      expect(winners[0].value).toMatchObject({
        startsAtMs,
        endsAtMs: startsAtMs + pkg.durationMin * MS_PER_MINUTE,
        servicePrice: pkg.price,
        depositRequired: pkg.deposit,
        depositRegistered: 0,
      })

      const stored = await admin.query(
        'SELECT count(*)::int AS total FROM public.scheduling_appointments WHERE resource_id = $1 AND starts_at = $2',
        [STUDIO_RESOURCE_ID, new Date(startsAtMs).toISOString()],
      )
      expect(stored.rows[0].total).toBe(1)
    },
    ROUND_TIMEOUT_MS,
  )
})
