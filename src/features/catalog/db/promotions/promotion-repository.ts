import type { SupabaseClient } from '@supabase/supabase-js'
import { isOk } from '@/shared/result'
import { createClient } from '@/shared/lib/supabase/server'
import { buildPromotion, promotionToView, type Promotion } from '../../domain/promotions/promotion'
import type { PromotionRepository } from '../../application/promotions/ports'

const TABLE = 'catalog_promotions'
const COLUMNS = 'id, technique_id, package_id, discount_percent, starts_at, ends_at, is_active'

type Row = {
  id: string
  technique_id: string | null
  package_id: string | null
  discount_percent: number
  starts_at: string
  ends_at: string
  is_active: boolean
}

function rowToDomain(row: Row): Promotion {
  const target =
    row.technique_id !== null
      ? ({ type: 'technique' as const, techniqueId: row.technique_id })
      : ({ type: 'package' as const, packageId: row.package_id as string })

  const built = buildPromotion({
    id: row.id,
    target,
    discountPercent: row.discount_percent,
    startsAt: new Date(row.starts_at),
    endsAt: new Date(row.ends_at),
    isActive: row.is_active,
  })
  if (!isOk(built)) {
    throw new Error(`fila inválida en ${TABLE} (${row.id}): ${built.error.message}`)
  }
  return built.value
}

function domainToRow(promotion: Promotion): Row {
  const view = promotionToView(promotion)
  return {
    id: view.id,
    technique_id: view.target.type === 'technique' ? view.target.techniqueId : null,
    package_id: view.target.type === 'package' ? view.target.packageId : null,
    discount_percent: view.discountPercent,
    starts_at: view.startsAt,
    ends_at: view.endsAt,
    is_active: view.isActive,
  }
}

export function createSupabasePromotionRepository(db: SupabaseClient): PromotionRepository {
  return {
    async list(params: { offset: number; limit: number }) {
      const { data, error, count } = await db
        .from(TABLE)
        .select(COLUMNS, { count: 'exact' })
        .order('starts_at', { ascending: false })
        .range(params.offset, params.offset + params.limit - 1)
      if (error) throw new Error(`${TABLE}.list: ${error.message}`)
      return {
        items: (data ?? []).map((row) => rowToDomain(row as unknown as Row)),
        total: count ?? 0,
      }
    },

    async listActive(now: Date, params: { offset: number; limit: number }) {
      const nowIso = now.toISOString()
      const { data, error, count } = await db
        .from(TABLE)
        .select(COLUMNS, { count: 'exact' })
        .eq('is_active', true)
        .lte('starts_at', nowIso)
        .gte('ends_at', nowIso)
        .order('ends_at', { ascending: true })
        .range(params.offset, params.offset + params.limit - 1)
      if (error) throw new Error(`${TABLE}.listActive: ${error.message}`)
      return {
        items: (data ?? []).map((row) => rowToDomain(row as unknown as Row)),
        total: count ?? 0,
      }
    },

    async findById(id: string): Promise<Promotion | null> {
      const { data, error } = await db.from(TABLE).select(COLUMNS).eq('id', id).maybeSingle()
      if (error) throw new Error(`${TABLE}.findById: ${error.message}`)
      return data ? rowToDomain(data as unknown as Row) : null
    },

    async save(promotion: Promotion): Promise<void> {
      const { error } = await db.from(TABLE).upsert(domainToRow(promotion), { onConflict: 'id' })
      if (error) throw new Error(`${TABLE}.save: ${error.message}`)
    },
  }
}

export async function promotionRepository(): Promise<PromotionRepository> {
  return createSupabasePromotionRepository(await createClient())
}
