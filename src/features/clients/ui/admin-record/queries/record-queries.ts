import { requireAdminSession } from '@/features/auth'
import { isErr } from '@/shared/result'
import { getClient } from '../../../application/queries'
import { viewRecord } from '../../../application/record/view-record'
import { auditRecordLog, listActiveCatalogTechniques } from '../../../application/record/record-gateways'
import { clientRepository } from '../../../db/client-repository'
import { recordRepository } from '../../../db/record/record-repository'
import { listPrecautionCategories } from '../../../db/record/precaution-category-repository'
import { signRecordImageUrls } from '../../../db/record/record-image-storage'
import { RECORD_ERROR_MESSAGES, RECORD_LABELS } from '../constants/record-strings'
import { toVersionView } from '../record-version-view'
import { isUuid } from '../../client-routes'
import type { ListCategoryOptionsResult, ListTechniqueOptionsResult, ViewRecordResult } from '../types/record-action-results'

const CLIENT_NOT_FOUND: ViewRecordResult = { ok: false, error: RECORD_ERROR_MESSAGES.clientNotFound, notFound: true }

async function signImages(paths: readonly string[]): Promise<Record<string, string>> {
  if (paths.length === 0) return {}
  try {
    return await signRecordImageUrls(paths)
  } catch {
    return {}
  }
}

export async function readRecord(clientId: string): Promise<ViewRecordResult> {
  const session = await requireAdminSession()
  if (!isUuid(clientId)) return CLIENT_NOT_FOUND
  const id = clientId.toLowerCase()
  const client = await getClient(await clientRepository())(id)
  if (isErr(client)) return client.error === 'not-found' ? CLIENT_NOT_FOUND : { ok: false, error: RECORD_LABELS.unexpectedError }
  const result = await viewRecord({ repo: await recordRepository(), auditLog: auditRecordLog })({ clientId: id, actorId: session.user.id })
  if (isErr(result)) return { ok: false, error: RECORD_ERROR_MESSAGES.auditFailed }
  const { current, history, initial } = result.value
  return {
    ok: true,
    current: current ? toVersionView(current) : null,
    history: history.map(toVersionView),
    initial: initial ? toVersionView(initial) : null,
    imageUrls: await signImages(current?.content.images ?? []),
  }
}

export async function readTechniqueOptions(): Promise<ListTechniqueOptionsResult> {
  await requireAdminSession()
  try {
    return { ok: true, techniques: await listActiveCatalogTechniques() }
  } catch {
    return { ok: false, error: RECORD_ERROR_MESSAGES.techniquesUnavailable }
  }
}

export async function readCategoryOptions(): Promise<ListCategoryOptionsResult> {
  await requireAdminSession()
  try {
    return { ok: true, categories: await listPrecautionCategories() }
  } catch {
    return { ok: false, error: RECORD_ERROR_MESSAGES.categoriesUnavailable }
  }
}
