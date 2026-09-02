'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { isErr } from '@/shared/result'
import { CATALOG_ADMIN_WRITE } from '../flags'
import {
  createTechnique,
  updateTechnique,
  deactivateTechnique,
  type CommandDeps,
} from '../application/commands'
import { techniqueRepository } from '../db/technique-repository'
import { techniqueFormSchema } from './schema'
import { catalogMessages } from './messages'
import type { TechniqueActionState } from './action-state'

const ADMIN_CATALOG_PATH = '/admin/catalog'

async function deps(): Promise<CommandDeps> {
  return { repo: await techniqueRepository(), newId: () => randomUUID() }
}

function disabled(): TechniqueActionState {
  return { status: 'disabled', message: catalogMessages.form.writeDisabled }
}

export async function createTechniqueAction(
  _prev: TechniqueActionState,
  formData: FormData,
): Promise<TechniqueActionState> {
  const parsed = techniqueFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      status: 'invalid',
      problems: parsed.error.issues.map((issue) => issue.message),
    }
  }
  if (!CATALOG_ADMIN_WRITE) return disabled()

  const result = await createTechnique(await deps())(parsed.data)
  if (isErr(result)) {
    return { status: 'invalid', problems: result.error.problems }
  }
  revalidatePath(ADMIN_CATALOG_PATH)
  return { status: 'ok', message: catalogMessages.form.savedCreate }
}

export async function updateTechniqueAction(
  _prev: TechniqueActionState,
  formData: FormData,
): Promise<TechniqueActionState> {
  const id = String(formData.get('id') ?? '')
  const parsed = techniqueFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      status: 'invalid',
      problems: parsed.error.issues.map((issue) => issue.message),
    }
  }
  if (!CATALOG_ADMIN_WRITE) return disabled()

  const result = await updateTechnique(await deps())(id, parsed.data)
  if (isErr(result)) {
    return {
      status: 'invalid',
      problems: 'problems' in result.error ? result.error.problems : [result.error.message],
    }
  }
  revalidatePath(ADMIN_CATALOG_PATH)
  return { status: 'ok', message: catalogMessages.form.savedEdit }
}

export async function deactivateTechniqueAction(
  _prev: TechniqueActionState,
  formData: FormData,
): Promise<TechniqueActionState> {
  const id = String(formData.get('id') ?? '')
  if (!CATALOG_ADMIN_WRITE) return disabled()

  const result = await deactivateTechnique(await deps())(id)
  if (isErr(result)) {
    return { status: 'invalid', problems: [result.error.message] }
  }
  revalidatePath(ADMIN_CATALOG_PATH)
  return { status: 'ok', message: catalogMessages.form.deactivated }
}
