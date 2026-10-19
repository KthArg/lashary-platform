import { ok, err, isErr, type Result } from '@/shared/result'
import type { Clock } from '@/shared/clock'
import type { RecordContent } from '../../domain/record/record-content'
import type { RecordImageProblem } from '../../domain/record/record-image'
import type { RecommendedTechnique } from '../../domain/record/record.types'
import type { PrecautionNotFound, RecordUnchanged, RecordValidationError } from '../../domain/record/record-errors'
import {
  addPrecaution,
  createInitialRecord,
  editStudy,
  removePrecaution,
  type RecordChange,
} from '../../domain/record/record-changes'
import type {
  PrecautionCategoryLookup,
  RecordActor,
  RecordAuditLog,
  RecordRepository,
  RecordVersion,
  TechniqueLookup,
} from './record-ports'

export interface RecordCommandFailure {
  readonly code:
    | 'record-missing'
    | 'record-exists'
    | 'version-conflict'
    | 'technique-not-found'
    | 'category-not-found'
    | 'saved-without-audit'
    | RecordImageProblem
}

export type RecordCommandError = RecordCommandFailure | RecordValidationError | PrecautionNotFound | RecordUnchanged

export type RecordCommandResult<T> = Result<T, RecordCommandError>

export interface RecordCommandDeps {
  readonly repo: RecordRepository
  readonly techniques: TechniqueLookup
  readonly categories: PrecautionCategoryLookup
  readonly auditLog: RecordAuditLog
  readonly newId: () => string
  readonly clock: Clock
}

export interface StudyInput {
  readonly studyText: string
  readonly recommendedTechniqueId: string | null
}

export interface PrecautionInput {
  readonly categoryId: string
  readonly description: string
}

export const failure = (code: RecordCommandFailure['code']): RecordCommandFailure => ({ code })

async function currentVersion(deps: RecordCommandDeps, clientId: string): Promise<RecordVersion | null> {
  const [latest] = await deps.repo.listVersions(clientId, 1)
  return latest ?? null
}

async function resolveTechnique(
  deps: RecordCommandDeps,
  techniqueId: string | null,
  current: RecommendedTechnique | null,
): Promise<RecordCommandResult<RecommendedTechnique | null>> {
  if (techniqueId === null) return ok(null)
  if (current?.id === techniqueId) return ok(current)
  const technique = await deps.techniques.findActiveTechnique(techniqueId)
  return technique ? ok(technique) : err(failure('technique-not-found'))
}

async function saveChange(
  deps: RecordCommandDeps,
  actor: RecordActor,
  previous: RecordVersion | null,
  change: RecordChange,
): Promise<RecordCommandResult<RecordVersion>> {
  const saved = await deps.repo.saveVersion({
    id: deps.newId(),
    clientId: actor.clientId,
    previousVersionId: previous?.id ?? null,
    changeKind: change.changeKind,
    content: change.content,
    createdBy: actor.actorId,
    createdAt: deps.clock(),
  })
  if (isErr(saved)) return err(failure('version-conflict'))
  const audited = await deps.auditLog({ ...actor, action: 'clients.record.updated' })
  if (!audited) return err(failure('saved-without-audit'))
  return saved
}

export async function updateRecord(
  deps: RecordCommandDeps,
  actor: RecordActor,
  applyChange: (content: RecordContent) => Promise<RecordCommandResult<RecordChange>>,
): Promise<RecordCommandResult<RecordVersion>> {
  const current = await currentVersion(deps, actor.clientId)
  if (current === null) return err(failure('record-missing'))
  const change = await applyChange(current.content)
  if (isErr(change)) return change
  return saveChange(deps, actor, current, change.value)
}

export const createRecord =
  (deps: RecordCommandDeps) =>
  async (actor: RecordActor, input: StudyInput): Promise<RecordCommandResult<RecordVersion>> => {
    if ((await currentVersion(deps, actor.clientId)) !== null) return err(failure('record-exists'))
    const technique = await resolveTechnique(deps, input.recommendedTechniqueId, null)
    if (isErr(technique)) return technique
    const change = createInitialRecord({
      studyText: input.studyText,
      recommendedTechnique: technique.value,
      precautions: [],
      images: [],
    })
    if (isErr(change)) return change
    return saveChange(deps, actor, null, change.value)
  }

export const addRecordPrecaution =
  (deps: RecordCommandDeps) =>
  (actor: RecordActor, input: PrecautionInput): Promise<RecordCommandResult<RecordVersion>> =>
    updateRecord(deps, actor, async (content) => {
      const category = await deps.categories.findCategory(input.categoryId)
      if (category === null) return err(failure('category-not-found'))
      return addPrecaution(content, {
        id: deps.newId(),
        categoryId: category.id,
        categoryName: category.name,
        description: input.description,
      })
    })

export const removeRecordPrecaution =
  (deps: RecordCommandDeps) =>
  (actor: RecordActor, precautionId: string): Promise<RecordCommandResult<RecordVersion>> =>
    updateRecord(deps, actor, async (content) => removePrecaution(content, precautionId))

export const editRecordStudy =
  (deps: RecordCommandDeps) =>
  (actor: RecordActor, input: StudyInput): Promise<RecordCommandResult<RecordVersion>> =>
    updateRecord(deps, actor, async (content) => {
      const technique = await resolveTechnique(deps, input.recommendedTechniqueId, content.recommendedTechnique)
      if (isErr(technique)) return technique
      return editStudy(content, { studyText: input.studyText, recommendedTechnique: technique.value })
    })
