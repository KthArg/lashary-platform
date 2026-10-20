import { describe, it, expect, beforeAll } from 'vitest'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''
const APPOINTMENTS_TABLE = 'scheduling_appointments'
const RESOURCES_TABLE = 'scheduling_resources'
const STUDIO_RESOURCE_ID = '00000000-0000-0000-0000-000000000a01'
const PROBE_STARTS_AT = '2027-06-01T10:00:00Z'
const PROBE_ENDS_AT = '2027-06-01T11:00:00Z'
const PROBE_OCCUPIED_RANGE = '[2027-06-01T09:45:00Z,2027-06-01T11:15:00Z)'

const configured = Boolean(URL && ANON_KEY)
let reachable = false

async function probeSupabase(): Promise<boolean> {
  try {
    const res = await fetch(`${URL}/rest/v1/`, { headers: { apikey: ANON_KEY } })
    return res.status < 500
  } catch {
    return false
  }
}

function itLive(name: string, fn: () => Promise<void>) {
  it(name, async (ctx) => {
    ctx.skip(!reachable)
    await fn()
  })
}

type SignedUpClienta = { client: SupabaseClient; userId: string }

async function signUpClienta(): Promise<SupabaseClient> {
  return (await signUpClientaWithId()).client
}

async function signUpClientaWithId(): Promise<SignedUpClienta> {
  const anon = createClient(URL, ANON_KEY)
  const email = `rls-test-${Date.now()}-${Math.random().toString(36).slice(2)}@lashary.test`
  const { data, error } = await anon.auth.signUp({
    email,
    password: `pw-${Math.random().toString(36).slice(2)}`,
  })
  if (error || !data.session) {
    throw new Error(
      `no se pudo crear la clienta de prueba: ${error?.message ?? 'sin sesión'}`,
    )
  }
  const client = createClient(URL, ANON_KEY, {
    global: {
      headers: { Authorization: `Bearer ${data.session.access_token}` },
    },
  })
  return { client, userId: data.session.user.id }
}

const probeAppointment = {
  resource_id: STUDIO_RESOURCE_ID,
  starts_at: PROBE_STARTS_AT,
  ends_at: PROBE_ENDS_AT,
  occupied_range: PROBE_OCCUPIED_RANGE,
}

const PROBE_TECHNIQUE_ID = '00000000-0000-0000-0000-0000000005e1'
const PROBE_TECHNIQUE_NAME = 'Técnica de prueba'
const PROBE_SERVICE_PRICE = 35000
const PROBE_DEPOSIT_REQUIRED = 10000
const CLIENTS_PROFILES_TABLE = 'clients_profiles'
const PROBE_CLIENT_PHONE = '+50688880000'

function probeBookingFor(clientId: string) {
  return {
    ...probeAppointment,
    client_id: clientId,
    technique_id: PROBE_TECHNIQUE_ID,
    technique_name: PROBE_TECHNIQUE_NAME,
    is_first_time: true,
    service_price: PROBE_SERVICE_PRICE,
    deposit_required: PROBE_DEPOSIT_REQUIRED,
  }
}

describe.skipIf(!configured)('SEC-002 — aislamiento RLS de scheduling', () => {
  let anon: SupabaseClient
  let clienta: SupabaseClient

  beforeAll(async () => {
    reachable = await probeSupabase()
    if (!reachable) {
      console.warn('[scheduling/rls] Supabase local no disponible — suite omitida.')
      return
    }
    anon = createClient(URL, ANON_KEY)
    clienta = await signUpClienta()
  })

  itLive('token anónimo no ve ninguna cita ni ningún recurso', async () => {
    const appointments = await anon.from(APPOINTMENTS_TABLE).select('id')
    expect(appointments.error).toBeNull()
    expect(appointments.data ?? []).toHaveLength(0)

    const resources = await anon.from(RESOURCES_TABLE).select('id')
    expect(resources.error).toBeNull()
    expect(resources.data ?? []).toHaveLength(0)
  })

  itLive('clienta autenticada sin rol de staff no ve ninguna cita ni ningún recurso', async () => {
    const staffCheck = await clienta.rpc('auth_is_staff')
    expect(staffCheck.error).toBeNull()
    expect(staffCheck.data).toBe(false)

    const appointments = await clienta.from(APPOINTMENTS_TABLE).select('id')
    expect(appointments.error).toBeNull()
    expect(appointments.data ?? []).toHaveLength(0)

    const resources = await clienta.from(RESOURCES_TABLE).select('id')
    expect(resources.error).toBeNull()
    expect(resources.data ?? []).toHaveLength(0)
  })

  itLive('token anónimo no puede crear una cita', async () => {
    const { error } = await anon.from(APPOINTMENTS_TABLE).insert(probeAppointment).select()
    expect(error).not.toBeNull()
  })

  itLive('clienta autenticada sin rol de staff no puede crear una cita', async () => {
    const { error } = await clienta.from(APPOINTMENTS_TABLE).insert(probeAppointment).select()
    expect(error).not.toBeNull()
  })

  itLive('clienta con perfil no puede crear una cita a su nombre ni ve ninguna', async () => {
    const { client, userId } = await signUpClientaWithId()
    const profile = await client
      .from(CLIENTS_PROFILES_TABLE)
      .insert({
        user_id: userId,
        full_name: 'Clienta de prueba',
        email: `rls-profile-${Date.now()}@lashary.test`,
        phone: PROBE_CLIENT_PHONE,
      })
      .select('id')
      .single()
    expect(profile.error).toBeNull()

    const booking = await client
      .from(APPOINTMENTS_TABLE)
      .insert(probeBookingFor(profile.data!.id))
      .select()
    expect(booking.error).not.toBeNull()

    const own = await client.from(APPOINTMENTS_TABLE).select('id')
    expect(own.error).toBeNull()
    expect(own.data ?? []).toHaveLength(0)
  })

  itLive('ni anon ni clienta pueden crear un recurso', async () => {
    const resource = { name: 'recurso de prueba' }
    expect((await anon.from(RESOURCES_TABLE).insert(resource).select()).error).not.toBeNull()
    expect((await clienta.from(RESOURCES_TABLE).insert(resource).select()).error).not.toBeNull()
  })

  itLive('tras los intentos, no quedó ninguna cita para quien no es staff', async () => {
    const { data } = await anon.from(APPOINTMENTS_TABLE).select('id')
    expect(data ?? []).toHaveLength(0)
  })
})
