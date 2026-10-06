'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { isErr } from '@/shared/result'
import { esStaff } from './staff-permission'
import {
  crearProducto,
  actualizarProducto,
  desactivarProducto,
  type ComandoProductoDeps,
} from '../../../application/admin-products/commands'
import { productoRepositorioAdmin } from '../../../db/admin-product-repository'
import { esquemaProductoAdmin } from '../validation/product-schema'
import { mensajesAdminProductos } from '../constants/product-strings'
import { rutasAdminProductos } from '../constants/product-routes'
import type { EstadoAccionProducto } from '../types/product-action-state'

async function deps(): Promise<ComandoProductoDeps> {
  return { repo: await productoRepositorioAdmin(), newId: () => randomUUID() }
}

function prohibido(): EstadoAccionProducto {
  return { status: 'forbidden', message: mensajesAdminProductos.form.accessDenied }
}

export async function crearProductoAction(
  _prev: EstadoAccionProducto,
  formData: FormData,
): Promise<EstadoAccionProducto> {
  if (!(await esStaff())) return prohibido()

  const parsed = esquemaProductoAdmin.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      status: 'invalid',
      problems: parsed.error.issues.map((issue) => issue.message),
    }
  }
  const result = await crearProducto(await deps())(parsed.data)
  if (isErr(result)) {
    return {
      status: 'invalid',
      problems: 'problems' in result.error ? result.error.problems : [result.error.message],
    }
  }
  revalidatePath(rutasAdminProductos.admin)
  return { status: 'ok', message: mensajesAdminProductos.form.savedCreate }
}

export async function actualizarProductoAction(
  _prev: EstadoAccionProducto,
  formData: FormData,
): Promise<EstadoAccionProducto> {
  if (!(await esStaff())) return prohibido()

  const id = String(formData.get('id') ?? '')
  const parsed = esquemaProductoAdmin.safeParse(Object.fromEntries(formData))
  if (!parsed.success) {
    return {
      status: 'invalid',
      problems: parsed.error.issues.map((issue) => issue.message),
    }
  }
  const result = await actualizarProducto(await deps())(id, parsed.data)
  if (isErr(result)) {
    return {
      status: 'invalid',
      problems: 'problems' in result.error ? result.error.problems : [result.error.message],
    }
  }
  revalidatePath(rutasAdminProductos.admin)
  return { status: 'ok', message: mensajesAdminProductos.form.savedEdit }
}

export async function desactivarProductoAction(
  _prev: EstadoAccionProducto,
  formData: FormData,
): Promise<EstadoAccionProducto> {
  if (!(await esStaff())) return prohibido()

  const id = String(formData.get('id') ?? '')

  const result = await desactivarProducto(await deps())(id)
  if (isErr(result)) {
    return { status: 'invalid', problems: [result.error.message] }
  }
  revalidatePath(rutasAdminProductos.admin)
  return { status: 'ok', message: mensajesAdminProductos.form.deactivated }
}
