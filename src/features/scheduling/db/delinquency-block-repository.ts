import type { SupabaseClient } from '@supabase/supabase-js'
import { z } from 'zod'
import { err, ok } from '@/shared/result'
import { storageFailed } from '../domain/errors'
import type { DelinquencyPort } from '../application/ports'

// `scheduling` no lee tablas de `delinquency` (ARCH-005): pregunta a sus funciones del contrato
// (docs/contracts/delinquency-api.md) y a `clients` quién es la clienta de la sesión.
export const CURRENT_PROFILE_FUNCTION = 'clients_current_profile_id'
export const BOOKING_BLOCK_FUNCTION = 'delinquency_booking_block'
export const APPOINTMENTS_TABLE = 'scheduling_appointments'

const UNEXPECTED_RESPONSE = 'respuesta inesperada al consultar el bloqueo por morosidad'

// `guid()` y no `uuid()`: Postgres acepta cualquier uuid y una respuesta válida no debe tumbar la reserva.
const profileSchema = z.guid().nullable()
const blockRowsSchema = z.array(
  z.object({
    appointment_id: z.guid(),
    pending: z.number().int().positive(),
    since: z.string(),
  }),
)
const startsAtSchema = z.object({ starts_at: z.string() })

export function createSupabaseDelinquencyPort(db: SupabaseClient): DelinquencyPort {
  return {
    async activeBlock() {
      const profile = await db.rpc(CURRENT_PROFILE_FUNCTION)
      if (profile.error) return err(storageFailed(profile.error.message))
      const clientId = profileSchema.safeParse(profile.data)
      if (!clientId.success) return err(storageFailed(UNEXPECTED_RESPONSE))
      // Sin perfil de clienta no hay morosidad que consultar; la reserva ya la rechaza por otra razón.
      if (clientId.data === null) return ok(null)

      const blocks = await db.rpc(BOOKING_BLOCK_FUNCTION, { p_client_id: clientId.data })
      if (blocks.error) return err(storageFailed(blocks.error.message))
      const rows = blockRowsSchema.safeParse(blocks.data ?? [])
      if (!rows.success) return err(storageFailed(UNEXPECTED_RESPONSE))

      // La función ya las ordena de la más antigua a la más reciente: la primera es la que se le dice a la clienta.
      const first = rows.data[0]
      if (!first) return ok(null)

      // La fecha de la cita es de `scheduling`. Si no se puede leer, el mensaje se dice sin ella.
      const appointment = await db
        .from(APPOINTMENTS_TABLE)
        .select('starts_at')
        .eq('id', first.appointment_id)
        .maybeSingle()
      const startsAt = appointment.error ? null : startsAtSchema.safeParse(appointment.data)
      return ok({
        appointmentId: first.appointment_id,
        pending: first.pending,
        appointmentStartsAtMs: startsAt?.success ? Date.parse(startsAt.data.starts_at) : null,
      })
    },
  }
}
