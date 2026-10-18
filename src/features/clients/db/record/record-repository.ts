import type { SupabaseClient } from '@supabase/supabase-js'
import { ok, err, isErr } from '@/shared/result'
import { createClient } from '@/shared/lib/supabase/server'
import { buildRecordContent } from '../../domain/record/record-content'
import type { Precaution, RecordChangeKind, RecommendedTechnique } from '../../domain/record/record.types'
import type { RecordRepository, RecordVersion } from '../../application/record/record-ports'

export const RECORD_VERSIONS_TABLE = 'clients_record_versions'
export const UNIQUE_VIOLATION_CODE = '23505'

const VERSION_COLUMNS = 'id, client_id, previous_version_id, change_kind, study_text, recommended_technique_id, recommended_technique_name, precautions, images, created_by, created_at'

export interface RecordVersionRow {
  id: string
  client_id: string
  previous_version_id: string | null
  change_kind: RecordChangeKind
  study_text: string
  recommended_technique_id: string | null
  recommended_technique_name: string | null
  precautions: unknown
  images: unknown
  created_by: string
  created_at: string
}

const isText = (value: unknown): value is string => typeof value === 'string'

function toPrecaution(value: unknown): Precaution {
  const { id, categoryId, categoryName, description } = (value ?? {}) as Record<string, unknown>
  if (!isText(id) || !isText(categoryId) || !isText(categoryName) || !isText(description)) {
    throw new Error('un antecedente guardado en clients_record_versions no tiene la forma esperada')
  }
  return { id, categoryId, categoryName, description }
}

function toPrecautions(value: unknown): Precaution[] {
  if (!Array.isArray(value)) throw new Error('los antecedentes guardados no son una lista')
  return value.map(toPrecaution)
}

function toImages(value: unknown): string[] {
  if (!Array.isArray(value) || !value.every(isText)) throw new Error('las imágenes guardadas no son una lista de rutas')
  return value
}

function toTechnique(row: RecordVersionRow): RecommendedTechnique | null {
  if (row.recommended_technique_id === null || row.recommended_technique_name === null) return null
  return { id: row.recommended_technique_id, name: row.recommended_technique_name }
}

export function versionToRow(version: RecordVersion): RecordVersionRow {
  const { content } = version
  return {
    id: version.id,
    client_id: version.clientId,
    previous_version_id: version.previousVersionId,
    change_kind: version.changeKind,
    study_text: content.studyText,
    recommended_technique_id: content.recommendedTechnique?.id ?? null,
    recommended_technique_name: content.recommendedTechnique?.name ?? null,
    precautions: content.precautions,
    images: content.images,
    created_by: version.createdBy,
    created_at: version.createdAt.toISOString(),
  }
}

export function rowToVersion(row: RecordVersionRow): RecordVersion {
  const content = buildRecordContent({
    studyText: row.study_text,
    recommendedTechnique: toTechnique(row),
    precautions: toPrecautions(row.precautions),
    images: toImages(row.images),
  })
  if (isErr(content)) throw new Error(`la versión ${row.id} guardada en la base no es válida`)
  return {
    id: row.id,
    clientId: row.client_id,
    previousVersionId: row.previous_version_id,
    changeKind: row.change_kind,
    content: content.value,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
  }
}

export function createSupabaseRecordRepository(db: SupabaseClient): RecordRepository {
  return {
    async listVersions(clientId, limit) {
      const { data, error } = await db
        .from(RECORD_VERSIONS_TABLE)
        .select(VERSION_COLUMNS)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false })
        .limit(limit)
      if (error || !data) throw new Error('no se pudo leer el expediente')
      return (data as RecordVersionRow[]).map(rowToVersion)
    },

    async saveVersion(version) {
      const { error } = await db.from(RECORD_VERSIONS_TABLE).insert(versionToRow(version))
      if (error?.code === UNIQUE_VIOLATION_CODE) return err('version-conflict')
      if (error) throw new Error('no se pudo guardar la versión del expediente')
      return ok(version)
    },
  }
}

export async function recordRepository(): Promise<RecordRepository> {
  return createSupabaseRecordRepository(await createClient())
}
