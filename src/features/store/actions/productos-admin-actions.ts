'use server'

import { randomUUID } from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { isErr } from '@/shared/result'
import { esStaff } from './permiso-staff'
import {
  crearProducto,
  actualizarProducto,
  desactivarProducto,
  type ComandoProductoDeps,
} from '../application/productos-admin-comandos'
import { productoRepositorioAdmin } from '../db/productos-admin-repositorio'
import { esquemaProductoAdmin } from './esquema-producto-admin'
import { mensajesAdminProductos } from '../constants/mensajes-admin-productos'
import { rutasAdminProductos } from '../constants/rutas-admin-productos'
import type { EstadoAccionProducto } from './estado-accion-producto'

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
