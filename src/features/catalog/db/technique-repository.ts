import type { SupabaseClient } from '@supabase/supabase-js'
import { Money } from '@/shared/money'
import { isOk } from '@/shared/result'
import { createClient } from '@/shared/lib/supabase/server'
import { Technique, type ServiceFamily } from '../domain/technique'
import type { TechniqueRepository } from '../application/ports'

const TABLE = 'catalog_techniques'
const COLUMNS =
  'id, name, family, price_first_time, price_retouch, duration_first_time_min, duration_retouch_min, buffer_min, reapplication_interval_days, deposit, aftercare_text, is_active'

type Row = {
  id: string
  name: string
  family: ServiceFamily
  price_first_time: number | string
  price_retouch: number | string | null
  duration_first_time_min: number
  duration_retouch_min: number | null
  buffer_min: number
  reapplication_interval_days: number | null
  deposit: number | string
  aftercare_text: string
  is_active: boolean
}

function rowToDomain(row: Row): Technique {
  const built = Technique.create({
    id: row.id,
    name: row.name,
    family: row.family,
    priceFirstTime: Money.fromColones(Number(row.price_first_time)),
    priceRetouch:
      row.price_retouch === null
        ? null
        : Money.fromColones(Number(row.price_retouch)),
    durationFirstTimeMin: row.duration_first_time_min,
    durationRetouchMin: row.duration_retouch_min,
    bufferMin: row.buffer_min,
    reapplicationIntervalDays: row.reapplication_interval_days,
    deposit: Money.fromColones(Number(row.deposit)),
    aftercareText: row.aftercare_text,
    isActive: row.is_active,
  })
  if (!isOk(built)) {
    // Una fila que no pasa los invariantes es corrupción de datos, no un caso de negocio.
    throw new Error(`fila inválida en ${TABLE} (${row.id}): ${built.error.message}`)
  }
  return built.value
}

function domainToRow(technique: Technique): Row {
  const view = technique.toView()
  return {
    id: view.id,
    name: view.name,
    family: view.family,
    price_first_time: view.priceFirstTime,
    price_retouch: view.priceRetouch,
    duration_first_time_min: view.durationFirstTimeMin,
    duration_retouch_min: view.durationRetouchMin,
    buffer_min: view.bufferMin,
    reapplication_interval_days: view.reapplicationIntervalDays,
    deposit: view.deposit,
    aftercare_text: view.aftercareText,
    is_active: view.isActive,
  }
}

export class SupabaseTechniqueRepository implements TechniqueRepository {
  constructor(private readonly db: SupabaseClient) {}

  async list(params: { activeOnly: boolean; offset: number; limit: number }) {
    let query = this.db
      .from(TABLE)
      .select(COLUMNS, { count: 'exact' })
      .order('family', { ascending: true })
      .order('name', { ascending: true })
      .range(params.offset, params.offset + params.limit - 1)

    if (params.activeOnly) query = query.eq('is_active', true)

    const { data, error, count } = await query
    if (error) throw new Error(`${TABLE}.list: ${error.message}`)
    return {
      items: (data ?? []).map((row) => rowToDomain(row as Row)),
      total: count ?? 0,
    }
  }

  async findById(id: string): Promise<Technique | null> {
    const { data, error } = await this.db
      .from(TABLE)
      .select(COLUMNS)
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`${TABLE}.findById: ${error.message}`)
    return data ? rowToDomain(data as Row) : null
  }

  async save(technique: Technique): Promise<void> {
    const { error } = await this.db
      .from(TABLE)
      .upsert(domainToRow(technique), { onConflict: 'id' })
    if (error) throw new Error(`${TABLE}.save: ${error.message}`)
  }
}

// Fábrica para el contexto de servidor de Next (server components / actions).
export async function techniqueRepository(): Promise<SupabaseTechniqueRepository> {
  return new SupabaseTechniqueRepository(await createClient())
}
