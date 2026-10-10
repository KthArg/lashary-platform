import type { SupabaseClient } from '@supabase/supabase-js'
import { Money } from '@/shared/money'
import { ok, err, isOk, type Result } from '@/shared/result'
import { createClient } from '@/shared/lib/supabase/server'
import { buildTechnique, techniqueToView, type Technique, type ServiceFamily } from '../../domain/techniques/technique'
import { techniqueNameConflict, type TechniqueNameConflict } from '../../domain/techniques/errors'
import type { TechniqueRepository } from '../../application/techniques/ports'

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
  const built = buildTechnique({
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
    throw new Error(`fila inválida en ${TABLE} (${row.id}): ${built.error.message}`)
  }
  return built.value
}

function domainToRow(technique: Technique): Row {
  const view = techniqueToView(technique)
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

export function createSupabaseTechniqueRepository(db: SupabaseClient): TechniqueRepository {
  return {
    async list(params: { activeOnly: boolean; offset: number; limit: number }) {
      let query = db
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
    },

    async findById(id: string): Promise<Technique | null> {
      const { data, error } = await db.from(TABLE).select(COLUMNS).eq('id', id).maybeSingle()
      if (error) throw new Error(`${TABLE}.findById: ${error.message}`)
      return data ? rowToDomain(data as Row) : null
    },

    async findByIds(ids: string[]): Promise<Technique[]> {
      if (ids.length === 0) return []
      const { data, error } = await db.from(TABLE).select(COLUMNS).in('id', ids)
      if (error) throw new Error(`${TABLE}.findByIds: ${error.message}`)
      return (data ?? []).map((row) => rowToDomain(row as Row))
    },

    async save(technique: Technique): Promise<Result<void, TechniqueNameConflict>> {
      const { error } = await db.from(TABLE).upsert(domainToRow(technique), { onConflict: 'id' })
      if (error) {
        if (error.code === '23505') return err(techniqueNameConflict(technique.name))
        throw new Error(`${TABLE}.save: ${error.message}`)
      }
      return ok(undefined)
    },
  }
}

export async function techniqueRepository(): Promise<TechniqueRepository> {
  return createSupabaseTechniqueRepository(await createClient())
}
