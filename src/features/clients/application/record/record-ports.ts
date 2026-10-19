import type { Result } from '@/shared/result'
import type { RecordContent } from '../../domain/record/record-content'
import type { RecordChangeKind, RecommendedTechnique } from '../../domain/record/record.types'

export interface RecordVersion {
  readonly id: string
  readonly clientId: string
  readonly previousVersionId: string | null
  readonly changeKind: RecordChangeKind
  readonly content: RecordContent
  readonly createdBy: string
  readonly createdAt: Date
}

export interface RecordRepository {
  listVersions(clientId: string, limit: number): Promise<RecordVersion[]>
  saveVersion(version: RecordVersion): Promise<Result<RecordVersion, 'version-conflict'>>
}

export interface PrecautionCategory {
  readonly id: string
  readonly name: string
}

export interface PrecautionCategoryLookup {
  findCategory(categoryId: string): Promise<PrecautionCategory | null>
}

export interface TechniqueLookup {
  findActiveTechnique(techniqueId: string): Promise<RecommendedTechnique | null>
}

export type RecordAuditAction = 'clients.record.viewed' | 'clients.record.updated'

export interface RecordAuditEvent {
  readonly actorId: string
  readonly action: RecordAuditAction
  readonly clientId: string
}

export type RecordAuditLog = (event: RecordAuditEvent) => Promise<boolean>

export interface RecordActor {
  readonly clientId: string
  readonly actorId: string
}

export interface RecordImageUpload {
  readonly bytes: Uint8Array
  readonly contentType: string
}

export interface RecordImageStorage {
  upload(path: string, image: RecordImageUpload): Promise<void>
}
