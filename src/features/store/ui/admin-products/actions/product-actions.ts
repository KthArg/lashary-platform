'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { isErr } from '@/shared/result'
import { isStaff } from './staff-permission'
import {
  createProduct,
  updateProduct,
  deactivateProduct,
  activateProduct,
  type ProductCommandDeps,
} from '../../../application/admin-products/commands'
import {
  uploadProductImage,
  removeStoredProductImage,
  type ProductImageDeps,
} from '../../../application/admin-products/product-images'
import { createProductNotFound } from '../../../domain/product-errors'
import { adminProductRepository } from '../../../db/admin-product-repository'
import { productImageStorage } from '../../../db/product-image-storage'
import { productSchema } from '../validation/product-schema'
import { productStrings } from '../constants/product-strings'
import { productRoutes } from '../constants/product-routes'
import type { ProductActionState } from '../types/product-action-state'

type ActionDeps = {
  products: ProductCommandDeps
  images: ProductImageDeps
}

async function deps(productId: string = randomUUID()): Promise<ActionDeps> {
  return {
    products: { repo: await adminProductRepository(), newId: () => productId },
    images: { storage: await productImageStorage(), newFileId: () => randomUUID() },
  }
}

function forbidden(): ProductActionState {
  return { status: 'forbidden', message: productStrings.form.accessDenied }
}

function invalid(problems: string[]): ProductActionState {
  return { status: 'invalid', problems }
}

function problemsOf(error: { message: string; problems?: string[] }): string[] {
  return error.problems ?? [error.message]
}

async function readImage(formData: FormData): Promise<Uint8Array | null> {
  const file = formData.get('image')
  if (!(file instanceof File) || file.size === 0) return null
  return new Uint8Array(await file.arrayBuffer())
}

export async function createProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  if (!(await isStaff())) return forbidden()

  const parsed = productSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error.issues.map((issue) => issue.message))

  const image = await readImage(formData)
  if (image === null) return invalid([productStrings.form.validation.imageRequired])

  const productId = randomUUID()
  const { products, images } = await deps(productId)
  const uploaded = await uploadProductImage(images)(productId, image)
  if (isErr(uploaded)) return invalid(uploaded.error.problems)

  const result = await createProduct(products)({ ...parsed.data, imageUrl: uploaded.value })
  if (isErr(result)) {
    await removeStoredProductImage(images)(uploaded.value)
    return invalid(problemsOf(result.error))
  }
  revalidatePath(productRoutes.admin)
  return { status: 'ok', message: productStrings.form.savedCreate }
}

export async function updateProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  if (!(await isStaff())) return forbidden()

  const id = String(formData.get('id') ?? '')
  const parsed = productSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return invalid(parsed.error.issues.map((issue) => issue.message))

  const { products, images } = await deps()
  const existing = await products.repo.findById(id)
  if (existing === null) return invalid([createProductNotFound(id).message])

  let imageUrl = existing.imageUrl
  const image = await readImage(formData)
  if (image !== null) {
    const uploaded = await uploadProductImage(images)(id, image)
    if (isErr(uploaded)) return invalid(uploaded.error.problems)
    imageUrl = uploaded.value
  }
  const replacedImage = imageUrl !== existing.imageUrl

  const result = await updateProduct(products)(id, { ...parsed.data, imageUrl })
  if (isErr(result)) {
    if (replacedImage) await removeStoredProductImage(images)(imageUrl)
    return invalid(problemsOf(result.error))
  }
  if (replacedImage) await removeStoredProductImage(images)(existing.imageUrl)
  revalidatePath(productRoutes.admin)
  return { status: 'ok', message: productStrings.form.savedEdit }
}

async function changeProductStatus(
  command: typeof deactivateProduct | typeof activateProduct,
  formData: FormData,
  successMessage: string,
): Promise<ProductActionState> {
  if (!(await isStaff())) return forbidden()

  const id = String(formData.get('id') ?? '')

  const result = await command((await deps()).products)(id)
  if (isErr(result)) {
    return { status: 'invalid', problems: [result.error.message] }
  }
  revalidatePath(productRoutes.admin)
  return { status: 'ok', message: successMessage }
}

export async function deactivateProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  return changeProductStatus(deactivateProduct, formData, productStrings.form.deactivated)
}

export async function activateProductAction(
  _prev: ProductActionState,
  formData: FormData,
): Promise<ProductActionState> {
  return changeProductStatus(activateProduct, formData, productStrings.form.activated)
}
