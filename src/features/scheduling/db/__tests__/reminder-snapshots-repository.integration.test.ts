import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Client as PgClient } from 'pg'
import { isOk } from '@/shared/result'
import { createSupabaseReminderSnapshotsRepository } from '../reminder-snapshots-repository'
import type { ReminderSnapshotsRepository } from '../../application/ports'

const API_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const DEFAULT_LOCAL_DB_URL = 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
const DB_URL = process.env.SUPABASE_DB_URL || DEFAULT_LOCAL_DB_URL
const LOCAL_HOSTS = ['127.0.0.1', 'localhost']

const STUDIO_RESOURCE_ID = '00000000-0000-0000-0000-000000000a01'
const STAFF_ROLE = 'admin'
const SETUP_TIMEOUT_MS = 60_000
const NO_PERSIST_OPTIONS = { auth: { persistSession: false, autoRefreshToken: false } }
const TEST_DAY_SPREAD = 300
const FIRST_TEST_DAY_MS = Date.parse('2043-01-01T10:00:00Z')
const MS_PER_DAY = 86_400_000

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
  console.warn('[scheduling/db] Supabase local no disponible — pruebas de integración de reminder-snapshots omitidas.')
}

function newTestStart(): Date {
  const dayOffset = Math.floor(Math.random() * TEST_DAY_SPREAD)
  return new Date(FIRST_TEST_DAY_MS + dayOffset * MS_PER_DAY)
}

describe.skipIf(!reachable)('createSupabaseReminderSnapshotsRepository (Supabase local)', () => {
  let admin: PgClient
  let staffClient: SupabaseClient
  let staffUserId: string
  let clientId: string
  let repo: ReminderSnapshotsRepository
  const seededAppointmentIds: string[] = []

  async function seedAppointment(options: { status: string; startsAt: Date; techniqueName?: string | null }): Promise<string> {
    const endsAt = new Date(options.startsAt.getTime() + 5 * 60_000)
    const result = await admin.query(
      `INSERT INTO public.scheduling_appointments
         (resource_id, status, starts_at, ends_at, occupied_range, client_id, technique_id, technique_name, is_first_time, service_price, deposit_required)
       VALUES ($1, $2, $3, $4, tstzrange($3, $4, '[)'), $5, $6, $7, $8, $9, $10)
       RETURNING id`,
      [
        STUDIO_RESOURCE_ID, options.status, options.startsAt.toISOString(), endsAt.toISOString(),
        clientId, crypto.randomUUID(), options.techniqueName ?? 'Técnica de prueba', true, 50_000, 10_000,
      ],
    )
    const id = result.rows[0].id as string
    seededAppointmentIds.push(id)
    return id
  }

  async function seedPackageAppointment(options: { status: string; startsAt: Date; packageName?: string }): Promise<string> {
    const endsAt = new Date(options.startsAt.getTime() + 5 * 60_000)
    const result = await admin.query(
      `INSERT INTO public.scheduling_appointments
         (resource_id, status, starts_at, ends_at, occupied_range, client_id, package_id, package_name, service_price, deposit_required)
       VALUES ($1, $2, $3, $4, tstzrange($3, $4, '[)'), $5, $6, $7, $8, $9)
       RETURNING id`,
      [
        STUDIO_RESOURCE_ID, options.status, options.startsAt.toISOString(), endsAt.toISOString(),
        clientId, crypto.randomUUID(), options.packageName ?? 'Paquete de prueba', 60_000, 15_000,
      ],
    )
    const id = result.rows[0].id as string
    seededAppointmentIds.push(id)
    return id
  }

  beforeAll(async () => {
    admin = new PgClient({ connectionString: DB_URL })
    await admin.connect()

    const anon = createClient(API_URL, ANON_KEY, NO_PERSIST_OPTIONS)
    const email = `reminder-snapshots-${Date.now()}-${Math.random().toString(36).slice(2)}@lashary.test`
    const { data, error } = await anon.auth.signUp({ email, password: `pw-${Math.random().toString(36).slice(2)}` })
    if (error || !data.session || !data.user) {
      throw new Error(`no se pudo crear la usuaria de prueba: ${error?.message ?? 'sin sesión'}`)
    }
    staffUserId = data.user.id
    staffClient = createClient(API_URL, ANON_KEY, {
      global: { headers: { Authorization: `Bearer ${data.session.access_token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    })
    await admin.query('UPDATE public.auth_user_roles SET role = $1 WHERE user_id = $2', [STAFF_ROLE, staffUserId])

    const profile = await admin.query(
      `INSERT INTO public.clients_profiles (full_name, email, phone) VALUES ($1, $2, $3) RETURNING id`,
      ['Clienta de prueba para snapshots', `clienta-snapshots-${Date.now()}@lashary.test`, '+50688881111'],
    )
    clientId = profile.rows[0].id as string

    repo = createSupabaseReminderSnapshotsRepository(staffClient)
  }, SETUP_TIMEOUT_MS)

  afterAll(async () => {
    if (!admin) return
    if (seededAppointmentIds.length > 0) {
      await admin.query('DELETE FROM public.scheduling_appointments WHERE id = ANY($1::uuid[])', [seededAppointmentIds])
    }
    if (clientId) await admin.query('DELETE FROM public.clients_profiles WHERE id = $1', [clientId])
    if (staffUserId) await admin.query('DELETE FROM auth.users WHERE id = $1', [staffUserId])
    await admin.end()
  })

  it('listActiveStartingWithin trae solo citas approved/confirmed dentro de la ventana', async () => {
    const windowStart = newTestStart()
    const approvedId = await seedAppointment({ status: 'approved', startsAt: windowStart, techniqueName: 'Técnica aprobada' })
    const confirmedId = await seedAppointment({ status: 'confirmed', startsAt: new Date(windowStart.getTime() + 6 * 60_000), techniqueName: 'Técnica confirmada' })
    const cancelledId = await seedAppointment({ status: 'cancelled', startsAt: new Date(windowStart.getTime() + 12 * 60_000), techniqueName: 'Técnica cancelada' })
    const outsideWindowId = await seedAppointment({ status: 'approved', startsAt: new Date(windowStart.getTime() + 10 * MS_PER_DAY), techniqueName: 'Fuera de ventana' })

    const result = await repo.listActiveStartingWithin({
      from: new Date(windowStart.getTime() - 60_000),
      to: new Date(windowStart.getTime() + 15 * 60_000),
    })
    expect(isOk(result)).toBe(true)
    if (!isOk(result)) return
    const ids = result.value.map((snapshot) => snapshot.appointmentId)
    expect(ids).toContain(approvedId)
    expect(ids).toContain(confirmedId)
    expect(ids).not.toContain(cancelledId)
    expect(ids).not.toContain(outsideWindowId)

    const approvedSnapshot = result.value.find((snapshot) => snapshot.appointmentId === approvedId)
    expect(approvedSnapshot).toMatchObject({ clientId, techniqueName: 'Técnica aprobada' })
  })

  it('getActiveById trae la cita activa, y null si no está activa o no existe', async () => {
    const start = newTestStart()
    const confirmedId = await seedAppointment({ status: 'confirmed', startsAt: start, techniqueName: 'Técnica para getActiveById' })
    const cancelledId = await seedAppointment({ status: 'cancelled', startsAt: new Date(start.getTime() + 60_000) })

    const found = await repo.getActiveById(confirmedId)
    expect(isOk(found)).toBe(true)
    if (isOk(found)) expect(found.value).toMatchObject({ appointmentId: confirmedId, clientId })

    const notActive = await repo.getActiveById(cancelledId)
    expect(isOk(notActive)).toBe(true)
    if (isOk(notActive)) expect(notActive.value).toBeNull()

    const missing = await repo.getActiveById(crypto.randomUUID())
    expect(isOk(missing)).toBe(true)
    if (isOk(missing)) expect(missing.value).toBeNull()
  })

  it('una cita de paquete (sin technique_name) sí produce snapshot, con el nombre del paquete (US-AGE-04)', async () => {
    const start = newTestStart()
    const packageId = await seedPackageAppointment({ status: 'approved', startsAt: start, packageName: 'Combo clásicas de prueba' })

    const result = await repo.getActiveById(packageId)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toMatchObject({ appointmentId: packageId, clientId, techniqueName: 'Combo clásicas de prueba' })

    const windowed = await repo.listActiveStartingWithin({
      from: new Date(start.getTime() - 60_000),
      to: new Date(start.getTime() + 15 * 60_000),
    })
    expect(isOk(windowed)).toBe(true)
    if (isOk(windowed)) {
      const snapshot = windowed.value.find((item) => item.appointmentId === packageId)
      expect(snapshot).toMatchObject({ techniqueName: 'Combo clásicas de prueba' })
    }
  })

  it('anon no puede leer ninguna cita por esta vía (SEC-002, fail-closed)', async () => {
    const start = newTestStart()
    const appointmentId = await seedAppointment({ status: 'approved', startsAt: start })
    const anonRepo = createSupabaseReminderSnapshotsRepository(createClient(API_URL, ANON_KEY, NO_PERSIST_OPTIONS))

    const result = await anonRepo.getActiveById(appointmentId)
    expect(isOk(result)).toBe(true)
    if (isOk(result)) expect(result.value).toBeNull()
  })
})
