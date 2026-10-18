import { record } from '@/features/audit'
import { getTechnique } from '@/features/catalog'
import { isOk } from '@/shared/result'
import type { RecordAuditLog, TechniqueLookup } from './record-ports'

export const RECORD_AUDIT_ENTITY_TYPE = 'clients_profile'

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
