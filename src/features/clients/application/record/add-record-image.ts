import { err, isErr } from '@/shared/result'
import { addImage } from '../../domain/record/record-changes'
import { recordImageExtension } from '../../domain/record/record-image'
import { failure, updateRecord, type RecordCommandDeps, type RecordCommandResult } from './record-commands'
import type { RecordActor, RecordImageStorage, RecordImageUpload, RecordVersion } from './record-ports'

export interface RecordImageDeps extends RecordCommandDeps {
  readonly images: RecordImageStorage
}

export const addRecordImage =
  (deps: RecordImageDeps) =>
  async (actor: RecordActor, image: RecordImageUpload): Promise<RecordCommandResult<RecordVersion>> => {
    const extension = recordImageExtension(image.contentType, image.bytes.byteLength)
    if (isErr(extension)) return err(failure(extension.error))
    return updateRecord(deps, actor, async (content) => {
      const path = `${actor.clientId}/${deps.newId()}.${extension.value}`
      await deps.images.upload(path, image)
      return addImage(content, path)
    })
  }
