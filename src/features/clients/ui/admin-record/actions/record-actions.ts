'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { requireAdminSession } from '@/features/auth'
import { systemClock } from '@/shared/clock'
import { isErr, type Result } from '@/shared/result'
import { viewRecord } from '../../../application/record/view-record'
import { auditRecordLog, catalogTechniqueLookup, listActiveCatalogTechniques } from '../../../application/record/record-gateways'
import { recordRepository } from '../../../db/record/record-repository'
import { precautionCategoryLookup } from '../../../db/record/precaution-category-repository'
import { RECORD_ERROR_CODES, isRecordValidationError } from '../../../domain/record/record-errors'
import {
  addRecordPrecaution,
  createRecord,
  editRecordStudy,
  removeRecordPrecaution,
  type RecordCommandDeps,
  type RecordCommandError,
  type StudyInput,
} from '../../../application/record/record-commands'
import { RECORD_ERROR_MESSAGES, RECORD_PROBLEM_MESSAGES } from '../constants/record-strings'
import type { RecordActor, RecordVersion } from '../../../application/record/record-ports'
import type {
  ListTechniqueOptionsResult,
  PrecautionFormInput,
  RecordVersionView,
  SaveRecordResult,
  StudyFormInput,
  ViewRecordResult,
} from '../types/record-action-results'
import { clientRecordPath, isUuid } from '../../client-routes'

const readText = (value: unknown): string => (typeof value === 'string' ? value : '')

const COMMAND_ERROR_MESSAGES: Record<Exclude<RecordCommandError['code'], typeof RECORD_ERROR_CODES.invalid>, string> = {
  'record-missing': RECORD_ERROR_MESSAGES.recordMissing,
  'record-exists': RECORD_ERROR_MESSAGES.recordExists,
  'version-conflict': RECORD_ERROR_MESSAGES.versionConflict,
  'technique-not-found': RECORD_ERROR_MESSAGES.techniqueNotFound,
  'category-not-found': RECORD_ERROR_MESSAGES.categoryNotFound,
  [RECORD_ERROR_CODES.precautionNotFound]: RECORD_ERROR_MESSAGES.precautionNotFound,
  [RECORD_ERROR_CODES.unchanged]: RECORD_ERROR_MESSAGES.unchanged,
}

const failed = (error: string, problems: string[] = []): SaveRecordResult => ({ ok: false, error, problems })

function toVersionView(version: RecordVersion): RecordVersionView {
  const { content } = version
  return {
    id: version.id,
    previousVersionId: version.previousVersionId,
    changeKind: version.changeKind,
    studyText: content.studyText,
    recommendedTechnique: content.recommendedTechnique,
    precautions: content.precautions.map((precaution) => ({ ...precaution })),
    images: [...content.images],
    createdBy: version.createdBy,
    createdAt: version.createdAt.toISOString(),
  }
}

function toSaveFailure(error: RecordCommandError): SaveRecordResult {
  if (isRecordValidationError(error)) {
    return failed(RECORD_ERROR_MESSAGES.invalid, error.problems.map((problem) => RECORD_PROBLEM_MESSAGES[problem]))
  }
  return failed(COMMAND_ERROR_MESSAGES[error.code])
}

function readStudy(input: StudyFormInput): StudyInput | null {
  const techniqueId = input?.recommendedTechniqueId
  if (techniqueId === null || techniqueId === undefined || techniqueId === '') {
    return { studyText: readText(input?.studyText), recommendedTechniqueId: null }
  }
  return isUuid(techniqueId) ? { studyText: readText(input.studyText), recommendedTechniqueId: techniqueId } : null
}

async function rejectInput(error: string): Promise<SaveRecordResult> {
  await requireAdminSession()
  return failed(error)
}

async function commandDeps(): Promise<RecordCommandDeps> {
  return {
    repo: await recordRepository(),
    categories: await precautionCategoryLookup(),
    techniques: catalogTechniqueLookup,
    auditLog: auditRecordLog,
    newId: () => randomUUID(),
    clock: systemClock,
  }
}

async function saveRecord(
  clientId: string,
  run: (deps: RecordCommandDeps, actor: RecordActor) => Promise<Result<RecordVersion, RecordCommandError>>,
): Promise<SaveRecordResult> {
  const session = await requireAdminSession()
  if (!isUuid(clientId)) return failed(RECORD_ERROR_MESSAGES.clientNotFound)
  const result = await run(await commandDeps(), { clientId, actorId: session.user.id })
  if (isErr(result)) return toSaveFailure(result.error)
  revalidatePath(clientRecordPath(clientId))
  return { ok: true, version: toVersionView(result.value) }
}

export async function viewRecordAction(clientId: string): Promise<ViewRecordResult> {
  const session = await requireAdminSession()
  if (!isUuid(clientId)) return { ok: false, error: RECORD_ERROR_MESSAGES.clientNotFound }
  const result = await viewRecord({ repo: await recordRepository(), auditLog: auditRecordLog })({
    clientId,
    actorId: session.user.id,
  })
  if (isErr(result)) return { ok: false, error: RECORD_ERROR_MESSAGES.auditFailed }
  const { current, history } = result.value
  return { ok: true, current: current ? toVersionView(current) : null, history: history.map(toVersionView) }
}

export async function createRecordAction(clientId: string, input: StudyFormInput): Promise<SaveRecordResult> {
  const study = readStudy(input)
  if (study === null) return rejectInput(RECORD_ERROR_MESSAGES.techniqueNotFound)
  return saveRecord(clientId, (deps, actor) => createRecord(deps)(actor, study))
}

export async function editRecordStudyAction(clientId: string, input: StudyFormInput): Promise<SaveRecordResult> {
  const study = readStudy(input)
  if (study === null) return rejectInput(RECORD_ERROR_MESSAGES.techniqueNotFound)
  return saveRecord(clientId, (deps, actor) => editRecordStudy(deps)(actor, study))
}

export async function addRecordPrecautionAction(clientId: string, input: PrecautionFormInput): Promise<SaveRecordResult> {
  const categoryId = input?.categoryId
  if (!isUuid(categoryId)) return rejectInput(RECORD_ERROR_MESSAGES.categoryNotFound)
  const description = readText(input.description)
  return saveRecord(clientId, (deps, actor) => addRecordPrecaution(deps)(actor, { categoryId, description }))
}

export async function removeRecordPrecautionAction(clientId: string, precautionId: string): Promise<SaveRecordResult> {
  return saveRecord(clientId, (deps, actor) => removeRecordPrecaution(deps)(actor, readText(precautionId)))
}

export async function listTechniqueOptionsAction(): Promise<ListTechniqueOptionsResult> {
  await requireAdminSession()
  try {
    return { ok: true, techniques: await listActiveCatalogTechniques() }
  } catch {
    return { ok: false, error: RECORD_ERROR_MESSAGES.techniquesUnavailable }
  }
}
