'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { isErr } from '@/shared/result'
import { isStaff } from './staff-permission'
import {
  createProduct,
  updateProduct,
  deactivateProduct,
  type ProductCommandDeps,
} from '../../../application/admin-products/commands'
import { adminProductRepository } from '../../../db/admin-product-repository'
import { productSchema } from '../validation/product-schema'
import { productStrings } from '../constants/product-strings'
import { productRoutes } from '../constants/product-routes'
import type { ProductActionState } from '../types/product-action-state'

async function deps(): Promise<ProductCommandDeps> {
  return { repo: await adminProductRepository(), newId: () => randomUUID() }
}

function prohibido(): ProductActionState {
  return { status: 'forbidden', message: productStrings.form.accessDenied }
}

export async function createProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  if (!(await isStaff())) return prohibido()

  const parsed = productSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      status: 'invalid',
      problems: parsed.error.issues.map((issue) => issue.message),
    }
  }
  const result = await createProduct(await deps())(parsed.data)
  if (isErr(result)) {
    return {
      status: 'invalid',
      problems: 'problems' in result.error ? result.error.problems : [result.error.message],
    }
  }
  revalidatePath(productRoutes.admin)
  return { status: 'ok', message: productStrings.form.savedCreate }
}

export async function updateProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  if (!(await isStaff())) return prohibido()

  const id = String(formData.get('id') ?? '')
  const parsed = productSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      status: 'invalid',
      problems: parsed.error.issues.map((issue) => issue.message),
    }
  }
  const result = await updateProduct(await deps())(id, parsed.data)
  if (isErr(result)) {
    return {
      status: 'invalid',
      problems: 'problems' in result.error ? result.error.problems : [result.error.message],
    }
  }
  revalidatePath(productRoutes.admin)
  return { status: 'ok', message: productStrings.form.savedEdit }
}

export async function deactivateProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  if (!(await isStaff())) return prohibido()

  const id = String(formData.get('id') ?? '')

  const result = await deactivateProduct(await deps())(id)
  if (isErr(result)) {
    return { status: 'invalid', problems: [result.error.message] }
  }
  revalidatePath(productRoutes.admin)
  return { status: 'ok', message: productStrings.form.deactivated }
}
