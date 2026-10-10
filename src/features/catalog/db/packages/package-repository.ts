import type { SupabaseClient } from '@supabase/supabase-js'
import { Money } from '@/shared/money'
import { ok, err, isOk, type Result } from '@/shared/result'
import { createClient } from '@/shared/lib/supabase/server'
import { buildPackage, packageToView, type Package } from '../../domain/packages/package'
import { packageNameConflict, type PackageNameConflict } from '../../domain/packages/errors'
import type { PackageRepository, PackageWithDuration } from '../../application/packages/ports'

const TABLE = 'catalog_packages'
const SAVE_FN = 'catalog_save_package_with_deposit'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const COLUMNS = `
  id, name, price, deposit, is_active,
  catalog_package_techniques ( technique_id, catalog_techniques ( duration_first_time_min, buffer_min ) )
`

type TechniqueRef = { duration_first_time_min: number; buffer_min: number } | null

type Row = {
  id: string
  name: string
  price: number | string
  deposit: number | string
  is_active: boolean
  catalog_package_techniques: { technique_id: string; catalog_techniques: TechniqueRef }[]
}

function rowToDomain(row: Row): PackageWithDuration {
  const techniqueIds = row.catalog_package_techniques.map((bridgeRow) => bridgeRow.technique_id)
  const durationTotalMin = row.catalog_package_techniques.reduce((total, bridgeRow) => {
    const technique = bridgeRow.catalog_techniques
    return total + (technique ? technique.duration_first_time_min + technique.buffer_min : 0)
  }, 0)

  const built = buildPackage({
    id: row.id,
    name: row.name,
    techniqueIds,
    price: Money.fromColones(Number(row.price)),
    deposit: Money.fromColones(Number(row.deposit)),
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
      if (!UUID.test(id)) return null
      const { data, error } = await db.from(TABLE).select(COLUMNS).eq('id', id).maybeSingle()
      if (error) throw new Error(`${TABLE}.findById: ${error.message}`)
      return data ? rowToDomain(data as unknown as Row) : null
    },

    async save(pkg: Package): Promise<Result<void, PackageNameConflict>> {
      const view = packageToView(pkg)
      const { error } = await db.rpc(SAVE_FN, {
        p_id: view.id,
        p_name: view.name,
        p_price: view.price,
        p_deposit: view.deposit,
        p_is_active: view.isActive,
        p_technique_ids: view.techniqueIds,
      })
      if (error) {
        if (error.code === '23505') return err(packageNameConflict(view.name))
        throw new Error(`${SAVE_FN}: ${error.message}`)
      }
      return ok(undefined)
    },
  }
}

export async function packageRepository(): Promise<PackageRepository> {
  return createSupabasePackageRepository(await createClient())
}
