import { z } from 'zod'
import { err, type Result } from '@/shared/result'
import { CLIENT_RECORD_AFTERCARE_PAGE_SIZE, type AdminAftercare } from '../domain/aftercare-message'
import { aftercareStorageFailed, type AftercareStorageFailed } from '../domain/errors'
import type { ClientRecordAftercareRepository } from './ports'

export const INVALID_CLIENT_ID = 'el identificador de la clienta no es válido'

export const loadClientRecordAftercare =
  (deps: { repository: ClientRecordAftercareRepository }) =>
  (clientId: string): Promise<Result<AdminAftercare[], AftercareStorageFailed>> => {
    if (!z.uuid().safeParse(clientId).success) return Promise.resolve(err(aftercareStorageFailed(INVALID_CLIENT_ID)))
    return deps.repository.listForClient(clientId, CLIENT_RECORD_AFTERCARE_PAGE_SIZE)
  }
