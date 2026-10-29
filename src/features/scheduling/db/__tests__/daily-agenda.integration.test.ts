import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Client as PgClient } from 'pg'
import { isOk } from '@/shared/result'
import { getDailyAgenda } from '../../application/daily-agenda'
import { createSupabaseDailyAgendaRepository } from '../daily-agenda-repository'

const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const DB_URL = process.env.SUPABASE_DB_URL || DEFAULT_LOCAL_DB_URL
const LOCAL_HOSTS = ['127.0.0.1', 'localhost']

const STUDIO_RESOURCE_ID = '00000000-0000-0000-0000-000000000a01'
// 2046: ningún otro archivo de integración escribe citas en ese año (SPEC de scheduling).
const AGENDA_DATE = '2046-05-14'
const SETUP_TIMEOUT_MS = 60_000
const TEST_PHONE_PREFIX = '+5068200'

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
  console.warn('[scheduling/db] Supabase local no disponible — prueba de la agenda diaria omitida.')
}

type SignedUpUser = { userId: string; client: SupabaseClient }

async function signUp(emailPrefix: string): Promise<SignedUpUser> {
  const anon = createClient(API_URL, ANON_KEY)
  const { data, error } = await anon.auth.signUp({
    email: `${emailPrefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@lashary.test`,
    password: `pw-${Math.random().toString(36).slice(2)}`,
  })
  if (error || !data.session || !data.user) {
    throw new Error(`no se pudo crear la cuenta de prueba: ${error?.message ?? 'sin sesión'}`)
  }
  const client = createClient(API_URL, ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
  })
  return { userId: data.user.id, client }
}

const agendaFor = (db: SupabaseClient) => getDailyAgenda({ repo: createSupabaseDailyAgendaRepository(db) })(AGENDA_DATE)

describe.skipIf(!reachable)('US-AGE-11 agenda diaria contra Supabase local (SEC-002)', () => {
  let admin: PgClient
  let staff: SignedUpUser
  let ana: SignedUpUser
  let eva: SignedUpUser
  const profiles: Record<string, string> = {}
  const appointmentIds: string[] = []

  async function insertAppointment(clientKey: string, status: string, startsAt: string, endsAt: string) {
    const inserted = await admin.query(
      `INSERT INTO public.scheduling_appointments
         (resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name,
          is_first_time, service_price, deposit_required, deposit_registered)
       VALUES ($1, $2, $3, $4, tstzrange($3, $4), $5, gen_random_uuid(), 'Clásicas', true, 25000, 10000, 0)
       RETURNING id`,
      [STUDIO_RESOURCE_ID, status, startsAt, endsAt, profiles[clientKey]],
    )
    appointmentIds.push(inserted.rows[0].id)
  }

  beforeAll(async () => {
    admin = new PgClient({ connectionString: DB_URL })
    await admin.connect()

    staff = await signUp('agenda-staff')
    await admin.query(`UPDATE public.auth_user_roles SET role = 'admin' WHERE user_id = $1`, [staff.userId])
    ana = await signUp('agenda-ana')
    eva = await signUp('agenda-eva')
    for (const [key, user, name, phone] of [
      ['ana', ana, 'Ana Agenda', `${TEST_PHONE_PREFIX}01`],
      ['eva', eva, 'Eva Agenda', `${TEST_PHONE_PREFIX}02`],
    ] as const) {
      const row = await admin.query(
        'INSERT INTO public.clients_profiles (user_id, full_name, email, phone) VALUES ($1, $2, $3, $4) RETURNING id',
        [user.userId, name, `agenda-${user.userId}@lashary.test`, phone],
      )
      profiles[key] = row.rows[0].id
    }

    // 14 de mayo de 2046 en la hora del estudio (UTC−6): 11:00, 09:00, una rechazada a las 13:00
    // y una cancelada a las 15:00.
    await insertAppointment('eva', 'pending_approval', '2046-05-14T17:00:00Z', '2046-05-14T18:00:00Z')
    await insertAppointment('ana', 'confirmed', '2046-05-14T15:00:00Z', '2046-05-14T16:30:00Z')
    await insertAppointment('ana', 'rejected', '2046-05-14T19:00:00Z', '2046-05-14T20:00:00Z')
    await insertAppointment('ana', 'cancelled', '2046-05-14T21:00:00Z', '2046-05-14T22:00:00Z')
    // Fuera del día del estudio: 23:30 del 13 de mayo, que en UTC ya es el 14.
    await insertAppointment('ana', 'confirmed', '2046-05-14T05:30:00Z', '2046-05-14T06:00:00Z')
  }, SETUP_TIMEOUT_MS)

  afterAll(async () => {
    if (!admin) return
    if (appointmentIds.length > 0) {
      await admin.query('DELETE FROM public.scheduling_appointments WHERE id = ANY($1::uuid[])', [appointmentIds])
    }
    const userIds = [staff, ana, eva].flatMap((user) => (user ? [user.userId] : []))
    if (userIds.length > 0) await admin.query('DELETE FROM auth.users WHERE id = ANY($1::uuid[])', [userIds])
    await admin.end()
  })

  it('la administradora ve las citas del día del estudio, en orden, con el nombre de cada clienta, la rechazada y sin la cancelada', async () => {
    const agenda = await agendaFor(staff.client)

    expect(isOk(agenda)).toBe(true)
    if (!isOk(agenda)) return
    expect(agenda.value.entries.map((entry) => [entry.clientName, entry.status, entry.durationMin])).toEqual([
      ['Ana Agenda', 'confirmed', 90],
      ['Eva Agenda', 'pending_approval', 60],
      ['Ana Agenda', 'rejected', 60],
    ])
    expect(agenda.value.entries.every((entry) => entry.paymentStatus === 'unpaid' && entry.isFirstTime)).toBe(true)
  })

  it('una clienta con su propio token solo alcanza sus citas, nunca la de otra ni su nombre (RLS, SEC-001)', async () => {
    const agenda = await agendaFor(ana.client)

    expect(isOk(agenda)).toBe(true)
    if (!isOk(agenda)) return
    expect(agenda.value.entries.map((entry) => entry.clientName)).toEqual(['Ana Agenda', 'Ana Agenda'])
    expect(JSON.stringify(agenda.value)).not.toContain('Eva Agenda')
  })

  it('una sesión anónima no ve ninguna cita', async () => {
    const agenda = await agendaFor(createClient(API_URL, ANON_KEY, { auth: { persistSession: false } }))

    expect(isOk(agenda)).toBe(true)
    if (!isOk(agenda)) return
    expect(agenda.value.entries).toEqual([])
  })
})
