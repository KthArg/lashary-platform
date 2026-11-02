'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { isErr } from '@/shared/result'
import { isStaff } from '../../require-staff'
import {
  createTechnique,
  updateTechnique,
  findPackagesAffectedByDeactivation,
  deactivateTechniqueCascade,
  type CommandDeps,
  type DeactivateDeps,
} from '../../../application/techniques/commands'
import { techniqueRepository } from '../../../db/techniques/technique-repository'
import { packageRepository } from '../../../db/packages/package-repository'
import { isTechniqueAffectedPackagesChanged, type AffectedPackage } from '../../../domain/techniques/errors'
import { techniqueFormSchema } from '../validation/technique-schema'
import { catalogMessages } from '../constants/technique-strings'
import { catalogRoutes } from '../../routes'
import type { TechniqueActionState } from '../types/technique-action-state'

async function deps(): Promise<CommandDeps> {
  return { repo: await techniqueRepository(), newId: () => randomUUID() }
}

async function deactivateDeps(): Promise<DeactivateDeps> {
  return { repo: await techniqueRepository(), packageRepo: await packageRepository() }
}

function forbidden(): TechniqueActionState {
  return { status: 'forbidden', message: catalogMessages.form.accessDenied }
}

export async function createTechniqueAction(
  _prev: TechniqueActionState,
  formData: FormData,
): Promise<TechniqueActionState> {
  if (!(await isStaff())) return forbidden()

  const parsed = techniqueFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      status: 'invalid',
      problems: parsed.error.issues.map((issue) => issue.message),
    }
  }
  const result = await createTechnique(await deps())(parsed.data)
  if (isErr(result)) {
    return {
      status: 'invalid',
      problems: 'problems' in result.error ? result.error.problems : [result.error.message],
    }
  }
  revalidatePath(catalogRoutes.admin)
  return { status: 'ok', message: catalogMessages.form.savedCreate }
}

export async function updateTechniqueAction(
  _prev: TechniqueActionState,
  formData: FormData,
): Promise<TechniqueActionState> {
  if (!(await isStaff())) return forbidden()

  const id = String(formData.get('id') ?? '')
  const parsed = techniqueFormSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      status: 'invalid',
      problems: parsed.error.issues.map((issue) => issue.message),
    }
  }
  const result = await updateTechnique(await deps())(id, parsed.data)
  if (isErr(result)) {
    return {
      status: 'invalid',
      problems: 'problems' in result.error ? result.error.problems : [result.error.message],
    }
  }
  revalidatePath(catalogRoutes.admin)
  return { status: 'ok', message: catalogMessages.form.savedEdit }
}

export type CheckTechniqueDeactivationResult =
  | { status: 'ok'; affectedPackages: AffectedPackage[] }
  | { status: 'forbidden' }
  | { status: 'notFound' }

export async function checkTechniqueDeactivationAction(id: string): Promise<CheckTechniqueDeactivationResult> {
  if (!(await isStaff())) return { status: 'forbidden' }

  const result = await findPackagesAffectedByDeactivation(await deactivateDeps())(id)
  if (isErr(result)) return { status: 'notFound' }
  return { status: 'ok', affectedPackages: result.value }
}

export async function deactivateTechniqueCascadeAction(
  _prev: TechniqueActionState,
  formData: FormData,
): Promise<TechniqueActionState> {
  if (!(await isStaff())) return forbidden()

  const id = String(formData.get('id') ?? '')
  const confirmedIds = formData.getAll('packageId').map(String)
  const confirmedNames = formData.getAll('packageName').map(String)
  const confirmedPackages: AffectedPackage[] = confirmedIds.map((packageId, index) => ({
    id: packageId,
    name: confirmedNames[index] ?? '',
  }))

  const result = await deactivateTechniqueCascade(await deactivateDeps())(id, confirmedPackages)
  if (isErr(result)) {
    if (isTechniqueAffectedPackagesChanged(result.error)) {
      return { status: 'invalid', problems: [catalogMessages.form.affectedPackagesChanged] }
    }
    return { status: 'invalid', problems: [result.error.message] }
  }

  revalidatePath(catalogRoutes.admin)
  const deactivatedNames = result.value.deactivatedPackages.map((affectedPackage) => affectedPackage.name)
  return {
    status: 'ok',
    message:
      deactivatedNames.length > 0
        ? catalogMessages.form.deactivatedWithPackages(deactivatedNames)
        : catalogMessages.form.deactivated,
  }
}
