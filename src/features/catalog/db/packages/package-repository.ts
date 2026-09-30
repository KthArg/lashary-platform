import type { SupabaseClient } from '@supabase/supabase-js'
import { Money } from '@/shared/money'
import { isOk } from '@/shared/result'
import { createClient } from '@/shared/lib/supabase/server'
import { createPackage, packageToView, type Package } from '../../domain/packages/package'
import { packageNameConflict } from '../../domain/packages/errors'
import type { PackageRepository, PackageWithDuration } from '../../application/packages/ports'

const TABLE = 'catalog_packages'
const BRIDGE_TABLE = 'catalog_package_techniques'

const COLUMNS = `
  id, name, price, is_active,
  catalog_package_techniques ( technique_id, catalog_techniques ( duration_first_time_min, buffer_min ) )
`

type TechniqueRef = { duration_first_time_min: number; buffer_min: number } | null

type Row = {
  id: string
  name: string
  price: number | string
  is_active: boolean
  catalog_package_techniques: { technique_id: string; catalog_techniques: TechniqueRef }[]
}

function rowToDomain(row: Row): PackageWithDuration {
  const techniqueIds = row.catalog_package_techniques.map((r) => r.technique_id)
  const durationTotalMin = row.catalog_package_techniques.reduce((total, r) => {
    const t = r.catalog_techniques
    return total + (t ? t.duration_first_time_min + t.buffer_min : 0)
  }, 0)

  const built = createPackage({
    id: row.id,
    name: row.name,
    techniqueIds,
    price: Money.fromColones(Number(row.price)),
    isActive: row.is_active,
  })
  if (!isOk(built)) {
    throw new Error(`fila inválida en ${TABLE} (${row.id}): ${built.error.message}`)
  }
  return { pkg: built.value, durationTotalMin }
}

export function createSupabasePackageRepository(db: SupabaseClient): PackageRepository {
  return {
    async list(params: { activeOnly: boolean; offset: number; limit: number }) {
      let query = db
        .from(TABLE)
        .select(COLUMNS, { count: 'exact' })
        .order('name', { ascending: true })
        .range(params.offset, params.offset + params.limit - 1)

      if (params.activeOnly) query = query.eq('is_active', true)

      const { data, error, count } = await query
      if (error) throw new Error(`${TABLE}.list: ${error.message}`)
      return {
        items: (data ?? []).map((row) => rowToDomain(row as unknown as Row)),
        total: count ?? 0,
      }
    },

    async findById(id: string): Promise<PackageWithDuration | null> {
      const { data, error } = await db.from(TABLE).select(COLUMNS).eq('id', id).maybeSingle()
      if (error) throw new Error(`${TABLE}.findById: ${error.message}`)
      return data ? rowToDomain(data as unknown as Row) : null
    },

    async save(pkg: Package): Promise<void> {
      const view = packageToView(pkg)
      const { error: upsertError } = await db
        .from(TABLE)
        .upsert({ id: view.id, name: view.name, price: view.price, is_active: view.isActive }, {
          onConflict: 'id',
        })
      if (upsertError) {
        if (upsertError.code === '23505') {
          throw packageNameConflict(view.name)
        }
        throw new Error(`${TABLE}.save: ${upsertError.message}`)
      }

      const { error: deleteError } = await db.from(BRIDGE_TABLE).delete().eq('package_id', view.id)
      if (deleteError) {
        throw new Error(`${BRIDGE_TABLE}.save: ${deleteError.message}`)
      }

      const { error: insertError } = await db
        .from(BRIDGE_TABLE)
        .insert(view.techniqueIds.map((technique_id) => ({ package_id: view.id, technique_id })))
      if (insertError) {
        throw new Error(`${BRIDGE_TABLE}.save: ${insertError.message}`)
      }
    },
  }
}

export async function packageRepository(): Promise<PackageRepository> {
  return createSupabasePackageRepository(await createClient())
}
