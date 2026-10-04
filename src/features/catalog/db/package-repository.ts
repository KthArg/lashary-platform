import type { SupabaseClient } from '@supabase/supabase-js'
import { Money } from '@/shared/money'
import { isOk } from '@/shared/result'
import { createClient } from '@/shared/lib/supabase/server'
import { Package } from '../domain/package'
import { PackageNameConflict } from '../domain/errors'
import type { PackageRepository, PackageWithDuration } from '../application/ports'

const TABLE = 'catalog_packages'
const BRIDGE_TABLE = 'catalog_package_techniques'

// Un solo join técnicas↔paquete (PERF-005): la duración total no vive en catalog_packages, se
// suma acá a partir de las técnicas miembro, en la misma consulta que trae el paquete.
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
    // catalog_techniques nunca debería venir null (FK real, sin borrado de técnicas) — 0 es
    // una salvaguarda defensiva, no el camino esperado.
    const t = r.catalog_techniques
    return total + (t ? t.duration_first_time_min + t.buffer_min : 0)
  }, 0)

  const built = Package.create({
    id: row.id,
    name: row.name,
    techniqueIds,
    price: Money.fromColones(Number(row.price)),
    isActive: row.is_active,
  })
  if (!isOk(built)) {
    // Una fila que no pasa los invariantes es corrupción de datos, no un caso de negocio.
    throw new Error(`fila inválida en ${TABLE} (${row.id}): ${built.error.message}`)
  }
  return { pkg: built.value, durationTotalMin }
}

export class SupabasePackageRepository implements PackageRepository {
  constructor(private readonly db: SupabaseClient) {}

  async list(params: { activeOnly: boolean; offset: number; limit: number }) {
    let query = this.db
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
  }

  async findById(id: string): Promise<PackageWithDuration | null> {
    const { data, error } = await this.db
      .from(TABLE)
      .select(COLUMNS)
      .eq('id', id)
      .maybeSingle()
    if (error) throw new Error(`${TABLE}.findById: ${error.message}`)
    return data ? rowToDomain(data as unknown as Row) : null
  }

  // No transaccional: actualiza el paquete y reemplaza sus filas puente en llamadas
  // secuenciales, no en una transacción SQL. Simplificación aceptada — DOM-011 (atomicidad) es
  // para el reagendado de citas, no aplica a la composición de un paquete a esta escala
  // (decisión documentada en SPEC.md).
  async save(pkg: Package): Promise<void> {
    const view = pkg.toView()
    const { error: upsertError } = await this.db
      .from(TABLE)
      .upsert({ id: view.id, name: view.name, price: view.price, is_active: view.isActive }, {
        onConflict: 'id',
      })
    if (upsertError) {
      // 23505 = unique_violation. La única constraint de unicidad de esta tabla es
      // catalog_packages_name_unique — un caso de negocio esperable, no una falla de infra.
      if (upsertError.code === '23505') {
        throw new PackageNameConflict(view.name)
      }
      throw new Error(`${TABLE}.save: ${upsertError.message}`)
    }

    const { error: deleteError } = await this.db
      .from(BRIDGE_TABLE)
      .delete()
      .eq('package_id', view.id)
    if (deleteError) {
      throw new Error(`${BRIDGE_TABLE}.save: ${deleteError.message}`)
    }

    const { error: insertError } = await this.db
      .from(BRIDGE_TABLE)
      .insert(view.techniqueIds.map((technique_id) => ({ package_id: view.id, technique_id })))
    if (insertError) {
      throw new Error(`${BRIDGE_TABLE}.save: ${insertError.message}`)
    }
  }
}

// Fábrica para el contexto de servidor de Next (server components / actions).
export async function packageRepository(): Promise<SupabasePackageRepository> {
  return new SupabasePackageRepository(await createClient())
}
