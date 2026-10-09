'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { isErr } from '@/shared/result'
import { isStaff } from '../../require-staff'
import {
  createPackage,
  updatePackage,
  deactivatePackage,
  type PackageCommandDeps,
} from '../../../application/packages/commands'
import { packageRepository } from '../../../db/packages/package-repository'
import { techniqueRepository } from '../../../db/techniques/technique-repository'
import { packageFormSchema } from '../validation/package-schema'
import { packageMessages } from '../constants/package-strings'
import { catalogRoutes } from '../../routes'
import type { PackageActionState } from '../types/package-action-state'

async function deps(): Promise<PackageCommandDeps> {
  return {
    packageRepo: await packageRepository(),
    techniqueRepo: await techniqueRepository(),
    newId: () => randomUUID(),
  }
}

function forbidden(): PackageActionState {
  return { status: 'forbidden', message: packageMessages.form.accessDenied }
}

function parseForm(formData: FormData) {
  return packageFormSchema.safeParse({
    name: formData.get('name'),
    price: formData.get('price'),
    deposit: formData.get('deposit'),
    techniqueIds: formData.getAll('techniqueIds'),
  })
}

export async function createPackageAction(
  _prev: PackageActionState,
  formData: FormData,
): Promise<PackageActionState> {
  if (!(await isStaff())) return forbidden()

  const parsed = parseForm(formData)
  if (!parsed.success) {
    return {
      status: 'invalid',
      problems: parsed.error.issues.map((issue) => issue.message),
    }
  }
  const result = await createPackage(await deps())(parsed.data)
  if (isErr(result)) {
    return {
      status: 'invalid',
      problems: 'problems' in result.error ? result.error.problems : [result.error.message],
    }
  }
  revalidatePath(catalogRoutes.packagesAdmin)
  return { status: 'ok', message: packageMessages.form.savedCreate }
}

export async function updatePackageAction(
  _prev: PackageActionState,
  formData: FormData,
): Promise<PackageActionState> {
  if (!(await isStaff())) return forbidden()

  const id = String(formData.get('id') ?? '')
  const parsed = parseForm(formData)
  if (!parsed.success) {
    return {
      status: 'invalid',
      problems: parsed.error.issues.map((issue) => issue.message),
    }
  }
  const result = await updatePackage(await deps())(id, parsed.data)
  if (isErr(result)) {
    return {
      status: 'invalid',
      problems: 'problems' in result.error ? result.error.problems : [result.error.message],
    }
  }
  revalidatePath(catalogRoutes.packagesAdmin)
  return { status: 'ok', message: packageMessages.form.savedEdit }
}

export async function deactivatePackageAction(
  _prev: PackageActionState,
  formData: FormData,
): Promise<PackageActionState> {
  if (!(await isStaff())) return forbidden()

  const id = String(formData.get('id') ?? '')

  const result = await deactivatePackage(await deps())(id)
  if (isErr(result)) {
    return { status: 'invalid', problems: [result.error.message] }
  }
  revalidatePath(catalogRoutes.packagesAdmin)
  return { status: 'ok', message: packageMessages.form.deactivated }
}
