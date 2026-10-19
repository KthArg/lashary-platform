import { record } from '@/features/audit'
import { getTechnique, listTechniques } from '@/features/catalog'
import { isOk } from '@/shared/result'
import type { RecommendedTechnique } from '../../domain/record/record.types'
import type { RecordAuditLog, TechniqueLookup } from './record-ports'

export const RECORD_AUDIT_ENTITY_TYPE = 'clients_profile'

export const TECHNIQUE_OPTIONS_LIMIT = 100

export const auditRecordLog: RecordAuditLog = async (event) => {
  try {
    const result = await record({
      actorId: event.actorId,
      action: event.action,
      entityType: RECORD_AUDIT_ENTITY_TYPE,
      entityId: event.clientId,
    })
    return isOk(result)
  } catch {
    return false
  }
}

export const catalogTechniqueLookup: TechniqueLookup = {
  async findActiveTechnique(techniqueId) {
    const result = await getTechnique(techniqueId)
    if (!isOk(result) || !result.value.isActive) return null
    return { id: result.value.id, name: result.value.name }
  },
}

export async function listActiveCatalogTechniques(): Promise<RecommendedTechnique[]> {
  const page = await listTechniques({ activeOnly: true, pageSize: TECHNIQUE_OPTIONS_LIMIT })
  return page.items.map((technique) => ({ id: technique.id, name: technique.name }))
}
