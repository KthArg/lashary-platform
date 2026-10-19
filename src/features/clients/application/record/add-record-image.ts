import { err, isErr } from '@/shared/result'
import { addImage } from '../../domain/record/record-changes'
import { recordValidationError } from '../../domain/record/record-errors'
import { detectImageType, recordImageExtension } from '../../domain/record/record-image'
import { RECORD_LIMITS } from '../../domain/record/record-limits'
import { failure, updateRecord, type RecordCommandDeps, type RecordCommandResult } from './record-commands'
import type { RecordActor, RecordImageStorage, RecordImageUpload, RecordVersion } from './record-ports'

export interface RecordImageDeps extends RecordCommandDeps {
  readonly images: RecordImageStorage
}

export const addRecordImage =
  (deps: RecordImageDeps) =>
  async (actor: RecordActor, image: RecordImageUpload): Promise<RecordCommandResult<RecordVersion>> => {
    const contentType = detectImageType(image.bytes) ?? ''
    const extension = recordImageExtension(contentType, image.bytes.byteLength)
    if (isErr(extension)) return err(failure(extension.error))
    return updateRecord(deps, actor, async (content) => {
      if (content.images.length >= RECORD_LIMITS.maxImages) return err(recordValidationError(['too-many-images']))
      const path = `${actor.clientId}/${deps.newId()}.${extension.value}`
      await deps.images.upload(path, { bytes: image.bytes, contentType })
      return addImage(content, path)
    })
  }
